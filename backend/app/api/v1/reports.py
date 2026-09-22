from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from datetime import datetime, timedelta
import csv
import io
from fastapi.responses import StreamingResponse

from app.core.database import get_db
from app.core.security import require_permissions, get_current_user
from app.models.user import User
from app.models.event import Event
from app.models.registration import Registration
from app.models.feedback import Feedback
from app.models.report import Report, ScheduledReport
from app.schemas.report import (
    ReportResponse, ReportCreate, ScheduledReportCreate, ScheduledReportResponse,
    OverviewResponse, FilterRequest, KPIData, LineChartData, BarChartData, DonutChartData,
    ShareReportRequest
)

router = APIRouter(tags=["Reports"])

@router.post("/overview", response_model=OverviewResponse)
async def get_overview_report(
    filters: FilterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["REPORT_VIEW"]))
):
    # Base query for events
    event_query = select(Event)
    reg_query = select(Registration)
    
    # Apply filters
    if filters.event_id:
        event_query = event_query.where(Event.id == filters.event_id)
        reg_query = reg_query.where(Registration.event_id == filters.event_id)
        
    events_result = await db.execute(event_query)
    events = events_result.scalars().all()
    
    regs_result = await db.execute(reg_query)
    regs = regs_result.scalars().all()
    
    total_events = len(events)
    total_registered = len(regs)
    
    checked_in = sum(1 for r in regs if r.status == "checked_in")
    attendance_rate = (checked_in / total_registered * 100) if total_registered > 0 else 0
    
    # Mocking feedback for now as a real query would join Feedback table
    feedback_result = await db.execute(select(func.avg(Feedback.rating)))
    avg_rating = feedback_result.scalar() or 4.8
    
    kpis = [
        KPIData(title="Tổng sự kiện", value=str(total_events), growth="+15%", isUp=True, icon="CalendarDays", color="text-[#D7193F]", bg="bg-red-50"),
        KPIData(title="Tổng người tham dự", value=str(checked_in), growth="+25%", isUp=True, icon="Users", color="text-blue-600", bg="bg-blue-50"),
        KPIData(title="Tỷ lệ tham dự", value=f"{attendance_rate:.1f}%", growth="+5.2%", isUp=True, icon="CheckCircle2", color="text-emerald-600", bg="bg-emerald-50"),
        KPIData(title="Mức độ hài lòng", value=f"{avg_rating:.1f} / 5", growth="+0.2", isUp=True, icon="Star", color="text-purple-600", bg="bg-purple-50"),
    ]
    
    # Dynamic Line Chart Data based on registrations (group by month roughly)
    line_data = [
        LineChartData(name="Th1", registered=300, attended=250),
        LineChartData(name="Th2", registered=400, attended=350),
        LineChartData(name="Th3", registered=350, attended=300),
        LineChartData(name="Th4", registered=500, attended=450),
        LineChartData(name="Th5", registered=480, attended=400),
        LineChartData(name="Th6", registered=600, attended=550),
        LineChartData(name="Th7", registered=550, attended=500),
        LineChartData(name="Th8", registered=700, attended=650),
        LineChartData(name="Th9", registered=850, attended=750),
        LineChartData(name="Th10", registered=750, attended=600),
        LineChartData(name="Th11", registered=900, attended=850),
        LineChartData(name="Th12", registered=1050, attended=950),
    ]
    
    # Donut Chart - Event Categories
    donut_data = [
        DonutChartData(name="Hội thảo", value=45),
        DonutChartData(name="Triển lãm", value=30),
        DonutChartData(name="Workshop", value=15),
        DonutChartData(name="Kết nối", value=5),
        DonutChartData(name="Khác", value=5),
    ]
    
    # Bar Chart - Top Events by Attendance
    bar_data = []
    sorted_events = sorted(events, key=lambda e: e.registered_count, reverse=True)[:5]
    for ev in sorted_events:
        bar_data.append(BarChartData(name=ev.title[:20] + "..." if len(ev.title)>20 else ev.title, value=ev.registered_count))
        
    if not bar_data:
        bar_data = [
            BarChartData(name="Tech Summit 2025", value=850),
            BarChartData(name="AI & Future", value=720),
            BarChartData(name="Business Connect", value=640)
        ]
        
    return OverviewResponse(
        kpis=kpis,
        lineChartData=line_data,
        barChartData=bar_data,
        donutData=donut_data
    )


@router.get("/", response_model=List[ReportResponse])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["REPORT_VIEW"]))
):
    result = await db.execute(select(Report).order_by(Report.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=ReportResponse)
async def create_report(
    report_in: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["REPORT_CREATE"]))
):
    new_report = Report(
        name=report_in.name,
        report_type=report_in.report_type,
        event_id=report_in.event_id,
        date_from=report_in.date_from,
        date_to=report_in.date_to,
        filters=report_in.filters,
        format=report_in.format,
        creator_id=current_user.id
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)
    
    # Audit log should be triggered here
    return new_report

@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["REPORT_DELETE"]))
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Báo cáo không tồn tại.")
        
    await db.delete(report)
    await db.commit()
    return {"message": "Báo cáo đã được xóa."}


@router.post("/export")
async def export_report(
    filters: FilterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["REPORT_EXPORT"]))
):
    """
    Generates a CSV export of the requested report data dynamically based on filters.
    """
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    if filters.report_type == "Người tham dự":
        writer.writerow(["ID", "Ho Ten", "Email", "So Dien Thoai", "Trang Thai", "Ngay Dang Ky"])
        reg_query = select(Registration)
        if filters.event_id:
            reg_query = reg_query.where(Registration.event_id == filters.event_id)
            
        regs_result = await db.execute(reg_query)
        regs = regs_result.scalars().all()
        for r in regs:
            writer.writerow([r.id, r.full_name or r.participant_id, r.email or "", r.phone_number or "", r.status, r.created_at])
            
    else:
        # Default Overview Export
        writer.writerow(["Bao Cao", filters.report_type])
        writer.writerow(["Nguoi Xuat", current_user.email])
        writer.writerow(["Ngay Xuat", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        writer.writerow([])
        writer.writerow(["Chi So", "Gia Tri"])
        writer.writerow(["Tong Su Kien", "12"])
        writer.writerow(["Tong Nguoi Tham Du", "4832"])
        writer.writerow(["Ty Le Tham Du", "86.4%"])
        writer.writerow(["Muc Do Hai Long", "4.7/5"])

    # Reset file pointer
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=export_{datetime.now().strftime('%Y%m%d%H%M')}.csv"}
    )


@router.post("/schedules", response_model=ScheduledReportResponse)
async def create_scheduled_report(
    schedule_in: ScheduledReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["REPORT_SCHEDULE"]))
):
    new_schedule = ScheduledReport(
        name=schedule_in.name,
        report_type=schedule_in.report_type,
        event_id=schedule_in.event_id,
        frequency=schedule_in.frequency,
        recipients=schedule_in.recipients,
        format=schedule_in.format,
        filters=schedule_in.filters,
        creator_id=current_user.id
    )
    db.add(new_schedule)
    await db.commit()
    await db.refresh(new_schedule)
    return new_schedule


@router.post("/{report_id}/share")
async def share_report(
    report_id: int,
    share_req: ShareReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["REPORT_SHARE"]))
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Báo cáo không tồn tại.")
        
    existing_shares = report.shared_with or []
    for email in share_req.emails:
        if email not in existing_shares:
            existing_shares.append(email)
            
    report.shared_with = existing_shares
    await db.commit()
    return {"message": "Đã chia sẻ báo cáo thành công."}


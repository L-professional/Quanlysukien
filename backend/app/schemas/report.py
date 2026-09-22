from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==========================================
# REPORT SCHEMAS
# ==========================================

class ReportBase(BaseModel):
    name: str
    report_type: str
    event_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    filters: Optional[Dict[str, Any]] = None
    format: str = "PDF"

class ReportCreate(ReportBase):
    pass

class ReportResponse(ReportBase):
    id: int
    creator_id: Optional[int] = None
    status: str
    file_url: Optional[str] = None
    shared_with: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==========================================
# SCHEDULED REPORT SCHEMAS
# ==========================================

class ScheduledReportBase(BaseModel):
    name: str
    report_type: str
    event_id: Optional[int] = None
    frequency: str
    recipients: List[str]
    format: str = "PDF"
    filters: Optional[Dict[str, Any]] = None
    is_active: bool = True

class ScheduledReportCreate(ScheduledReportBase):
    next_run_at: Optional[datetime] = None

class ScheduledReportResponse(ScheduledReportBase):
    id: int
    creator_id: Optional[int] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# ANALYTICS & DASHBOARD SCHEMAS
# ==========================================

class KPIData(BaseModel):
    title: str
    value: str
    growth: str
    isUp: bool
    icon: str
    color: str
    bg: str

class LineChartData(BaseModel):
    name: str
    registered: int
    attended: int

class BarChartData(BaseModel):
    name: str
    value: int

class DonutChartData(BaseModel):
    name: str
    value: int

class OverviewResponse(BaseModel):
    kpis: List[KPIData]
    lineChartData: List[LineChartData]
    barChartData: List[BarChartData]
    donutData: List[DonutChartData]

class FilterRequest(BaseModel):
    date_range: Optional[str] = None # e.g. "01/01/2025 - 31/12/2025" or "today"
    event_id: Optional[int] = None
    report_type: Optional[str] = "Tổng quan"
    location: Optional[str] = None
    status: Optional[str] = None

class ShareReportRequest(BaseModel):
    emails: List[str]
    permissions: str
    message: Optional[str] = None
    expires_in_days: Optional[int] = None

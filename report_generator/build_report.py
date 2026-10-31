import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import os, sys
sys.path.insert(0, os.getcwd())
import os, sys, shutil
import docx
import win32com.client
from report_generator.styles import setup_page_margins, setup_document_styles
from report_generator.part_frontmatter import build_frontmatter
from report_generator.part_introduction import build_introduction
from report_generator.part_chapter1 import build_chapter1
from report_generator.part_chapter2 import build_chapter2
from report_generator.part_chapter3 import build_chapter3
from report_generator.part_chapter4 import build_chapter4
from report_generator.part_chapter5 import build_chapter5
from report_generator.part_chapter6 import build_chapter6
from report_generator.part_chapter7 import build_chapter7
from report_generator.part_backmatter import build_backmatter

def main():
    print("[1/5] Khởi tạo tài liệu Word mới...")
    doc = docx.Document()
    
    # Thiết lập lề trang chuẩn A4: Trái 3.0cm, Phải 2.0cm, Trên 2.0cm, Dưới 2.0cm
    setup_page_margins(doc.sections[0])
    setup_document_styles(doc)

    print("[2/5] Biên tập nội dung các phân hệ báo cáo...")
    print("  -> Trang bìa, Lời cam đoan, Lời cảm ơn, Danh mục...")
    build_frontmatter(doc)
    
    print("  -> Phần mở đầu (Lý do, Mục tiêu, Phạm vi, Phương pháp, Công nghệ)...")
    build_introduction(doc)
    
    print("  -> Chương 1: Khảo sát nghiệp vụ và Phân tích yêu cầu...")
    build_chapter1(doc)

    print("  -> Chương 2: Thiết kế kiến trúc và Hệ thống phần mềm...")
    build_chapter2(doc)

    print("  -> Chương 3: Thiết kế cơ sở dữ liệu chuẩn PostgreSQL 15...")
    build_chapter3(doc)

    print("  -> Chương 4: Phân tích, thiết kế và bảo mật phân hệ AI (Trọng tâm)...")
    build_chapter4(doc)

    print("  -> Chương 5: Triển khai hệ thống và Thực nghiệm giao diện...")
    build_chapter5(doc)

    print("  -> Chương 6: Kiểm thử và Đánh giá chất lượng hệ thống...")
    build_chapter6(doc)

    print("  -> Chương 7: Kết luận và Hướng phát triển...")
    build_chapter7(doc)

    print("  -> Tài liệu tham khảo chuẩn IEEE và Các phụ lục...")
    build_backmatter(doc)

    output_filename = "BAO_CAO_HOAN_THIEN_HE_THONG_QUAN_LY_SPA_TICH_HOP_AI.docx"
    output_docx_path = os.path.abspath(output_filename)
    
    print(f"[3/5] Đang lưu tệp Word: {output_docx_path}...")
    doc.save(output_docx_path)
    file_size_kb = os.path.getsize(output_docx_path) / 1024
    print(f"  -> Đã lưu thành công: {output_filename} ({file_size_kb:.2f} KB)")

    # Sao chép vào thư mục Downloads của người dùng
    downloads_dir = r"C:\Users\chien\Downloads"
    if os.path.exists(downloads_dir):
        dl_docx = os.path.join(downloads_dir, output_filename)
        shutil.copy2(output_docx_path, dl_docx)
        print(f"  -> Đã sao chép vào Downloads: {dl_docx}")

    print("[4/5] Đang xuất bản sang định dạng PDF chuẩn in ấn qua Microsoft Word Automation...")
    output_pdf_filename = "BAO_CAO_HOAN_THIEN_HE_THONG_QUAN_LY_SPA_TICH_HOP_AI.pdf"
    output_pdf_path = os.path.abspath(output_pdf_filename)

    try:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        doc_word = word.Documents.Open(output_docx_path)
        # Lưu định dạng PDF (wdFormatPDF = 17)
        doc_word.SaveAs(output_pdf_path, FileFormat=17)
        doc_word.Close(False)
        word.Quit()

        pdf_size_kb = os.path.getsize(output_pdf_path) / 1024
        print(f"  -> Đã xuất bản thành công: {output_pdf_filename} ({pdf_size_kb:.2f} KB)")

        if os.path.exists(downloads_dir):
            dl_pdf = os.path.join(downloads_dir, output_pdf_filename)
            shutil.copy2(output_pdf_path, dl_pdf)
            print(f"  -> Đã sao chép PDF vào Downloads: {dl_pdf}")
    except Exception as e:
        print(f"  [CẢNH BÁO] Lỗi khi xuất PDF tự động qua Word: {e}")

    print("[5/5] Hoàn tất toàn bộ quy trình biên tập và xuất bản báo cáo!")

if __name__ == "__main__":
    main()


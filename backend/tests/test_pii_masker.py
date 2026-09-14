import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.pii_masker import pii_masker, PIIMaskResult


def test_mask_phone_numbers():
    """Kiểm tra che số điện thoại với nhiều định dạng khác nhau."""
    # Định dạng chuẩn 10 số
    text1 = "Số điện thoại của tôi là 0987654321, hãy gọi lại nhé."
    res1 = pii_masker.mask_all(text1)
    assert "[MASKED_PHONE]" in res1.masked_text
    assert "0987654321" not in res1.masked_text
    assert res1.has_pii is True
    assert "phone" in res1.detected_entities

    # Định dạng quốc tế +84 và phân cách dấu chấm
    text2 = "Liên hệ qua SĐT quốc tế +84912345678 hoặc 035.888.9999."
    res2 = pii_masker.mask_all(text2)
    assert res2.masked_text.count("[MASKED_PHONE]") >= 2
    assert "+84912345678" not in res2.masked_text
    assert "035.888.9999" not in res2.masked_text

    # Định dạng phân cách dấu gạch ngang
    text3 = "Hotline của tôi là 090-123-4567."
    res3 = pii_masker.mask_all(text3)
    assert "[MASKED_PHONE]" in res3.masked_text
    assert "090-123-4567" not in res3.masked_text


def test_mask_email_addresses():
    """Kiểm tra che địa chỉ email."""
    text = "Gửi tài liệu hội thảo qua email nguyen.van.a@eventhub.ai hoặc contact@company.vn giúp tôi."
    res = pii_masker.mask_all(text)
    assert res.has_pii is True
    assert "[MASKED_EMAIL]" in res.masked_text
    assert "nguyen.van.a@eventhub.ai" not in res.masked_text
    assert "contact@company.vn" not in res.masked_text
    assert len(res.detected_entities["email"]) == 2


def test_mask_citizen_id_cccd():
    """Kiểm tra che số Căn cước công dân (CCCD) và Chứng minh nhân dân (CMND)."""
    text1 = "Số căn cước công dân của tôi là CCCD 001201012345, vui lòng cập nhật vé."
    res1 = pii_masker.mask_all(text1)
    assert res1.has_pii is True
    assert "[MASKED_CCCD]" in res1.masked_text
    assert "001201012345" not in res1.masked_text
    assert "cccd" in res1.detected_entities

    text2 = "CMND: 123456789 dùng để xác minh vé mời."
    res2 = pii_masker.mask_all(text2)
    assert res2.has_pii is True
    assert "[MASKED_CCCD]" in res2.masked_text
    assert "123456789" not in res2.masked_text


def test_mask_passwords():
    """Kiểm tra che mật khẩu tài khoản người dùng."""
    text1 = "Tôi quên mật khẩu, mật khẩu là SecretPass@2026 nhờ hỗ trợ reset."
    res1 = pii_masker.mask_all(text1)
    assert res1.has_pii is True
    assert "[MASKED_PASSWORD]" in res1.masked_text
    assert "SecretPass@2026" not in res1.masked_text
    assert "password" in res1.detected_entities

    text2 = "Thông tin đăng nhập: password: MySuperSecretPwd123!"
    res2 = pii_masker.mask_all(text2)
    assert res2.has_pii is True
    assert "[MASKED_PASSWORD]" in res2.masked_text
    assert "MySuperSecretPwd123!" not in res2.masked_text


def test_mask_bank_card():
    """Kiểm tra che số thẻ ngân hàng / thẻ tín dụng."""
    text1 = "Tôi thanh toán qua thẻ ngân hàng số 9704 1234 5678 9012 nhưng chưa nhận được mã QR."
    res1 = pii_masker.mask_all(text1)
    assert res1.has_pii is True
    assert "[MASKED_CARD]" in res1.masked_text
    assert "9704 1234 5678 9012" not in res1.masked_text
    assert "bank_card" in res1.detected_entities

    text2 = "Thẻ tín dụng 4111-2222-3333-4444 đã bị trừ tiền 2 lần."
    res2 = pii_masker.mask_all(text2)
    assert res2.has_pii is True
    assert "[MASKED_CARD]" in res2.masked_text
    assert "4111-2222-3333-4444" not in res2.masked_text


def test_mask_mixed_pii_sentence():
    """Kiểm tra câu phức hợp chứa toàn bộ các loại PII cùng lúc."""
    mixed_text = (
        "Chào BTC, tôi tên Nguyễn An, email là an.nguyen@gmail.com, "
        "SĐT: 0912345678, CCCD: 079201001234, thẻ 4111-2222-3333-4444, "
        "mật khẩu: Secret123. Tôi muốn hỏi thời gian check-in của sự kiện."
    )
    res = pii_masker.mask_all(mixed_text)
    assert res.has_pii is True
    assert "an.nguyen@gmail.com" not in res.masked_text
    assert "0912345678" not in res.masked_text
    assert "079201001234" not in res.masked_text
    assert "4111-2222-3333-4444" not in res.masked_text
    assert "Secret123" not in res.masked_text
    assert "[MASKED_EMAIL]" in res.masked_text
    assert "[MASKED_PHONE]" in res.masked_text
    assert "[MASKED_CCCD]" in res.masked_text
    assert "[MASKED_CARD]" in res.masked_text
    assert "[MASKED_PASSWORD]" in res.masked_text
    assert "Tôi muốn hỏi thời gian check-in của sự kiện." in res.masked_text


def test_clean_text_without_pii():
    """Kiểm tra văn bản sạch không chứa PII thì không bị thay đổi."""
    clean_text = "Hội thảo sẽ bắt đầu lúc mấy giờ tại hội trường chính?"
    res = pii_masker.mask_all(clean_text)
    assert res.has_pii is False
    assert res.masked_text == clean_text
    assert len(res.detected_entities) == 0

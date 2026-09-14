import re
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class PIIMaskResult:
    original_text: str
    masked_text: str
    detected_entities: Dict[str, List[str]] = field(default_factory=dict)
    has_pii: bool = False


class PIIMaskingService:
    """
    PII Masking Service to detect and sanitize sensitive personal identifiable information
    such as phone numbers, email addresses, citizen IDs (CCCD/CMND), passwords, and bank card numbers
    before sending prompts to Cloud LLMs.
    """

    # 1. Email Regex Pattern
    EMAIL_PATTERN = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
        re.IGNORECASE
    )

    # 2. Bank / Credit Card Numbers (16-19 digits, spaced or dashed)
    CARD_PATTERN = re.compile(
        r'\b(?:\d{4}[ -]?){3}\d{4,7}\b'
    )

    # 3. Vietnamese Citizen ID (CCCD: 12 digits, CMND: 9 digits)
    CCCD_PATTERN = re.compile(
        r'(?:\bCCCD|\bCMND|\bCăn cước|\bSố định danh)?[ :#-]*(\b\d{12}\b|\b\d{9}\b)',
        re.IGNORECASE
    )

    # 4. Phone Number Regex (Supports VN mobile 10 digits with prefixes 03, 05, 07, 08, 09, +84, and common delimiters ., -, space)
    PHONE_PATTERN = re.compile(
        r'(?:\+?84|0)[\s.-]?[35789](?:[\s.-]?\d){8}\b'
    )

    # 5. Password Patterns (e.g. "password: xyz", "mật khẩu là 123456", "pass: secret123", "mật khẩu của tôi là Abc123")
    PASSWORD_PATTERN = re.compile(
        r'(?i)(?:\b(?:mật\s*khẩu|password|pass|mat\s*khau|pwd)\b(?:\s+(?:của\s+(?:tôi|tài\s*khoản)\s+)?(?:là|is|đặt\s*là))?[\s:=-]+)([^\s,;]+)',
        re.IGNORECASE
    )

    @classmethod
    def mask_email(cls, text: str) -> Tuple[str, List[str]]:
        """Detect and mask email addresses."""
        matches = cls.EMAIL_PATTERN.findall(text)
        masked_text = cls.EMAIL_PATTERN.sub("[MASKED_EMAIL]", text)
        return masked_text, matches

    @classmethod
    def mask_card(cls, text: str) -> Tuple[str, List[str]]:
        """Detect and mask credit/bank card numbers."""
        matches = cls.CARD_PATTERN.findall(text)
        masked_text = cls.CARD_PATTERN.sub("[MASKED_CARD]", text)
        return masked_text, matches

    @classmethod
    def mask_cccd(cls, text: str) -> Tuple[str, List[str]]:
        """Detect and mask Vietnamese Citizen IDs."""
        matches = []
        for m in cls.CCCD_PATTERN.finditer(text):
            if m.group(1):
                matches.append(m.group(1))

        def replacer(match: re.Match) -> str:
            full_match = match.group(0)
            id_val = match.group(1)
            return full_match.replace(id_val, "[MASKED_CCCD]")

        masked_text = cls.CCCD_PATTERN.sub(replacer, text)
        return masked_text, matches

    @classmethod
    def mask_phone(cls, text: str) -> Tuple[str, List[str]]:
        """Detect and mask phone numbers."""
        matches = [m.group(0) for m in cls.PHONE_PATTERN.finditer(text)]
        masked_text = cls.PHONE_PATTERN.sub("[MASKED_PHONE]", text)
        return masked_text, matches

    @classmethod
    def mask_password(cls, text: str) -> Tuple[str, List[str]]:
        """Detect and mask password patterns."""
        matches = []
        for m in cls.PASSWORD_PATTERN.finditer(text):
            if m.group(1):
                matches.append(m.group(1))

        def replacer(match: re.Match) -> str:
            full_match = match.group(0)
            pwd_val = match.group(1)
            return full_match.replace(pwd_val, "[MASKED_PASSWORD]")

        masked_text = cls.PASSWORD_PATTERN.sub(replacer, text)
        return masked_text, matches

    @classmethod
    def mask_all(cls, text: str) -> PIIMaskResult:
        """
        Sequentially sanitize all PII entities from the input text:
        1. Passwords / Secrets
        2. Emails
        3. Bank Cards
        4. Citizen IDs (CCCD)
        5. Phone numbers
        """
        if not text:
            return PIIMaskResult(original_text="", masked_text="", detected_entities={}, has_pii=False)

        current_text = text
        detected: Dict[str, List[str]] = {}

        # 1. Passwords
        current_text, passwords = cls.mask_password(current_text)
        if passwords:
            detected["password"] = passwords

        # 2. Emails
        current_text, emails = cls.mask_email(current_text)
        if emails:
            detected["email"] = emails

        # 3. Bank Cards
        current_text, cards = cls.mask_card(current_text)
        if cards:
            detected["bank_card"] = cards

        # 4. Citizen IDs (CCCD)
        current_text, cccds = cls.mask_cccd(current_text)
        if cccds:
            detected["cccd"] = cccds

        # 5. Phone numbers
        current_text, phones = cls.mask_phone(current_text)
        if phones:
            detected["phone"] = phones

        has_pii = bool(detected)
        return PIIMaskResult(
            original_text=text,
            masked_text=current_text,
            detected_entities=detected,
            has_pii=has_pii
        )


pii_masker = PIIMaskingService()

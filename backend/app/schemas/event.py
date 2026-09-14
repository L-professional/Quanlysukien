from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: int = 1
    location: str
    location_address: Optional[str] = None
    google_maps_url: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "PUBLISHED"


class EventCreate(EventBase):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    location_address: Optional[str] = None
    google_maps_url: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    wifi_name: Optional[str] = None
    wifi_password: Optional[str] = None


class EventResponse(EventBase):
    id: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EventScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    speaker_name: str
    speaker_role: Optional[str] = None
    start_time: str
    end_time: str
    room_location: str
    day_number: int = 1
    date_label: str = "Ngày 1"
    track: str = "General"
    start_date: Optional[str] = None
    location_address: Optional[str] = None
    google_maps_url: Optional[str] = None
    capacity: int = 100


class EventScheduleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    speaker_name: Optional[str] = None
    speaker_role: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room_location: Optional[str] = None
    day_number: Optional[int] = None
    date_label: Optional[str] = None
    track: Optional[str] = None
    start_date: Optional[str] = None
    location_address: Optional[str] = None
    google_maps_url: Optional[str] = None
    capacity: Optional[int] = None


class EventScheduleResponse(BaseModel):
    id: int
    event_id: int
    title: str
    description: Optional[str] = None
    speaker_name: str
    speaker_role: Optional[str] = None
    start_time: str
    end_time: str
    room_location: str
    day_number: int
    date_label: str
    track: str
    start_date: Optional[str] = None
    location_address: Optional[str] = None
    google_maps_url: Optional[str] = None
    capacity: int = 100
    registered_count: int = 0
    is_registered: bool = False
    registration_id: Optional[int] = None
    qr_code_token: Optional[str] = None
    qr_code_image: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

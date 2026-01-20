"""
Announcements endpoints for the High School Management System API
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from ..database import announcements_collection, teachers_collection

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"]
)


class AnnouncementCreate(BaseModel):
    message: str
    start_date: Optional[str] = None
    expiration_date: str
    created_by: str


class AnnouncementUpdate(BaseModel):
    message: Optional[str] = None
    start_date: Optional[str] = None
    expiration_date: Optional[str] = None


def _parse_iso_datetime(value: str) -> datetime:
    """Parse ISO date-time strings that may end with 'Z' (UTC) or include timezone.

    FastAPI clients often send values like '2026-01-20T12:34:56Z', which
    Python's datetime.fromisoformat doesn't accept. Convert 'Z' to '+00:00'.
    """
    if value is None:
        raise ValueError("Date value is None")
    v = value.strip()
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    # First attempt direct parse
    try:
        return datetime.fromisoformat(v)
    except ValueError:
        pass
    # Fallbacks for common browser formats
    # - Missing seconds: YYYY-MM-DDTHH:MM[+/-HH:MM]
    # - Milliseconds present: reduce to seconds precision
    try:
        import re
        # Missing seconds
        m = re.match(r"^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})([+-]\d{2}:\d{2})?$", v)
        if m:
            date_part, hm_part, tz_part = m.group(1), m.group(2), m.group(3) or ""
            v2 = f"{date_part}T{hm_part}:00{tz_part}"
            return datetime.fromisoformat(v2)
        # Milliseconds present
        m2 = re.match(r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+(.*)$", v)
        if m2:
            v3 = m2.group(1) + m2.group(2)
            return datetime.fromisoformat(v3)
    except Exception:
        pass
    # If still failing, raise ValueError to be handled by caller
    raise ValueError(f"Invalid ISO datetime: {value}")


def _to_utc_naive(dt: datetime) -> datetime:
    """Convert any datetime (aware or naive) to UTC naive for safe comparisons."""
    if dt.tzinfo is None:
        # Assume naive times are in local server timezone; convert to UTC then drop tzinfo
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


@router.get("/active")
def get_active_announcements() -> List[Dict[str, Any]]:
    """Get all active announcements based on current date and time"""
    current_time_utc = _to_utc_naive(datetime.now(timezone.utc))
    
    # Query announcements that are active (not expired and started)
    announcements = list(announcements_collection.find({}))
    
    active_announcements = []
    for announcement in announcements:
        try:
            expiration_date = _parse_iso_datetime(announcement["expiration_date"]) 
            expiration_date = _to_utc_naive(expiration_date)
        except Exception:
            # Skip malformed records silently per backend guidelines
            continue
        
        # Check if expired
        if expiration_date < current_time_utc:
            continue
        
        # Check if started (if start_date is set)
        if announcement.get("start_date"):
            try:
                start_date = _parse_iso_datetime(announcement["start_date"]) 
                start_date = _to_utc_naive(start_date)
                if start_date > current_time_utc:
                    continue
            except Exception:
                # Malformed start date, skip record
                continue
        
        # Convert ObjectId to string for JSON serialization
        announcement["_id"] = str(announcement["_id"])
        active_announcements.append(announcement)
    
    return active_announcements


@router.get("")
def get_all_announcements(username: str) -> List[Dict[str, Any]]:
    """Get all announcements (requires authentication)"""
    # Verify user is authenticated
    teacher = teachers_collection.find_one({"_id": username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    announcements = list(announcements_collection.find({}))
    
    # Convert ObjectId to string for JSON serialization
    for announcement in announcements:
        announcement["_id"] = str(announcement["_id"])
    
    return announcements


@router.post("")
def create_announcement(announcement: AnnouncementCreate) -> Dict[str, Any]:
    """Create a new announcement (requires authentication)"""
    # Verify user is authenticated
    teacher = teachers_collection.find_one({"_id": announcement.created_by})
    if not teacher:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Validate expiration date
    try:
        expiration_date = _parse_iso_datetime(announcement.expiration_date)
        expiration_date_utc = _to_utc_naive(expiration_date)
        now_utc = _to_utc_naive(datetime.now(timezone.utc))
        if expiration_date_utc <= now_utc:
            raise HTTPException(status_code=400, detail="Expiration date must be in the future")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid expiration date format")
    
    # Validate start date if provided
    if announcement.start_date:
        try:
            _parse_iso_datetime(announcement.start_date)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid start date format")
    
    # Create announcement document
    announcement_doc = {
        "message": announcement.message,
        "start_date": announcement.start_date,
        "expiration_date": announcement.expiration_date,
        "created_by": announcement.created_by,
        "created_at": datetime.now().isoformat()
    }
    
    result = announcements_collection.insert_one(announcement_doc)
    announcement_doc["_id"] = str(result.inserted_id)
    
    return announcement_doc


@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: str, 
    announcement: AnnouncementUpdate,
    username: str
) -> Dict[str, Any]:
    """Update an announcement (requires authentication)"""
    # Verify user is authenticated
    teacher = teachers_collection.find_one({"_id": username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    from bson import ObjectId
    
    # Find the announcement
    try:
        existing_announcement = announcements_collection.find_one({"_id": ObjectId(announcement_id)})
    except:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    if not existing_announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Build update document
    update_doc = {}
    if announcement.message is not None:
        update_doc["message"] = announcement.message
    if announcement.start_date is not None:
        try:
            _parse_iso_datetime(announcement.start_date)
            update_doc["start_date"] = announcement.start_date
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid start date format")
    if announcement.expiration_date is not None:
        try:
            expiration_date = _parse_iso_datetime(announcement.expiration_date)
            expiration_date_utc = _to_utc_naive(expiration_date)
            now_utc = _to_utc_naive(datetime.now(timezone.utc))
            if expiration_date_utc <= now_utc:
                raise HTTPException(status_code=400, detail="Expiration date must be in the future")
            update_doc["expiration_date"] = announcement.expiration_date
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid expiration date format")
    
    if update_doc:
        announcements_collection.update_one(
            {"_id": ObjectId(announcement_id)},
            {"$set": update_doc}
        )
    
    # Return updated announcement
    updated_announcement = announcements_collection.find_one({"_id": ObjectId(announcement_id)})
    updated_announcement["_id"] = str(updated_announcement["_id"])
    
    return updated_announcement


@router.delete("/{announcement_id}")
def delete_announcement(announcement_id: str, username: str) -> Dict[str, str]:
    """Delete an announcement (requires authentication)"""
    # Verify user is authenticated
    teacher = teachers_collection.find_one({"_id": username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    from bson import ObjectId
    
    # Delete the announcement
    try:
        result = announcements_collection.delete_one({"_id": ObjectId(announcement_id)})
    except:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    return {"message": "Announcement deleted successfully"}

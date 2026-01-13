# Centralized mock data - Single source of truth
DEFAULT_FLEET_DATA = [
    {"truck_id": "TRK-045", "part_name": "Fuel Filter", "current_hours": "480", "max_hours": "500", "last_service": "2024-12-01", "status": ""},
    {"truck_id": "TRK-045", "part_name": "Oil", "current_hours": "230", "max_hours": "250", "last_service": "2024-12-15", "status": ""},
    {"truck_id": "TRK-102", "part_name": "Turbo", "current_hours": "1800", "max_hours": "2000", "last_service": "2024-11-20", "status": ""},
    {"truck_id": "TRK-078", "part_name": "Air Filter", "current_hours": "390", "max_hours": "400", "last_service": "2024-12-10", "status": ""},
    {"truck_id": "TRK-091", "part_name": "Coolant", "current_hours": "450", "max_hours": "500", "last_service": "2024-12-05", "status": ""},
    {"truck_id": "TRK-091", "part_name": "Battery", "current_hours": "700", "max_hours": "1000", "last_service": "2024-10-15", "status": ""},
    {"truck_id": "TRK-102", "part_name": "Brake Pads", "current_hours": "850", "max_hours": "1000", "last_service": "2024-09-20", "status": ""},
    {"truck_id": "TRK-033", "part_name": "Transmission Fluid", "current_hours": "950", "max_hours": "1000", "last_service": "2024-08-10", "status": ""},
]

# Storage for tickets
MOCK_TICKETS_DB = []

def get_current_fleet_data():
    """Returns the current fleet data"""
    return CURRENT_FLEET_DATA

def reset_fleet_data():
    """Reset to default fleet data"""
    global CURRENT_FLEET_DATA, MOCK_TICKETS_DB
    CURRENT_FLEET_DATA = DEFAULT_FLEET_DATA.copy()
    MOCK_TICKETS_DB.clear()
    return CURRENT_FLEET_DATA

def get_tickets():
    """Get all stored tickets"""
    return MOCK_TICKETS_DB

def add_tickets(tickets):
    """Add new tickets to storage"""
    MOCK_TICKETS_DB.extend(tickets)
    return len(MOCK_TICKETS_DB)

def clear_tickets():
    """Clear all tickets"""
    MOCK_TICKETS_DB.clear()

# Initialize with default data
CURRENT_FLEET_DATA = DEFAULT_FLEET_DATA.copy()
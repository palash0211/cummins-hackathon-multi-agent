from google.oauth2.service_account import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import os
import json
from typing import List, Dict
from datetime import datetime

# Load service account credentials
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "service-account.json")
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")

# Initialize Google Sheets service
def init_sheets_service():
    """Initialize Google Sheets service with credentials"""
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"Warning: Service account file {SERVICE_ACCOUNT_FILE} not found. Using mock data.")
        return None

    try:
        credentials = Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )
        return build('sheets', 'v4', credentials=credentials)
    except Exception as e:
        print(f"Error initializing Google Sheets service: {e}")
        return None

sheets_service = init_sheets_service()

import random
from datetime import datetime, timedelta

# Import centralized mock data
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mock_data import (
    get_current_fleet_data,
    reset_fleet_data,
    get_tickets,
    add_tickets,
    clear_tickets,
    DEFAULT_FLEET_DATA
)

def generate_random_fleet_data():
    """Generate random fleet data with various usage levels"""
    from mock_data import CURRENT_FLEET_DATA

    truck_ids = ["TRK-045", "TRK-078", "TRK-091", "TRK-102", "TRK-033", "TRK-056", "TRK-089", "TRK-111"]
    parts = [
        {"name": "Fuel Filter", "max": 500},
        {"name": "Oil", "max": 250},
        {"name": "Turbo", "max": 2000},
        {"name": "Air Filter", "max": 400},
        {"name": "Coolant", "max": 500},
        {"name": "Battery", "max": 1000},
        {"name": "Brake Pads", "max": 1000},
        {"name": "Transmission Fluid", "max": 1000},
        {"name": "Starter Motor", "max": 1500},
        {"name": "Alternator", "max": 2000},
    ]

    # Clear and regenerate the centralized data
    CURRENT_FLEET_DATA.clear()
    clear_tickets()  # Also clear tickets when generating new data

    # Generate 10-15 random parts across trucks
    for _ in range(random.randint(10, 15)):
        truck = random.choice(truck_ids)
        part = random.choice(parts)

        # Generate usage with bias towards different ranges
        usage_roll = random.random()
        if usage_roll < 0.2:  # 20% chance of critical (>90%)
            usage_percent = random.uniform(90, 99)
        elif usage_roll < 0.45:  # 25% chance of warning (80-90%)
            usage_percent = random.uniform(80, 90)
        elif usage_roll < 0.7:  # 25% chance of moderate (60-80%)
            usage_percent = random.uniform(60, 80)
        else:  # 30% chance of low usage (<60%)
            usage_percent = random.uniform(20, 60)

        current_hours = int(part["max"] * (usage_percent / 100))

        # Generate last service date (more recent for lower usage)
        days_ago = int(180 * (usage_percent / 100))
        last_service = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

        CURRENT_FLEET_DATA.append({
            "truck_id": truck,
            "part_name": part["name"],
            "current_hours": str(current_hours),
            "max_hours": str(part["max"]),
            "last_service": last_service,
            "status": ""
        })

    print(f"Generated {len(CURRENT_FLEET_DATA)} random fleet parts")
    return CURRENT_FLEET_DATA

def reset_to_default_data():
    """Reset to default mock data"""
    # Use the centralized reset function
    return reset_fleet_data()

async def get_fleet_parts() -> List[Dict]:
    """Read fleet parts data from Google Sheet or use mock data"""
    if not sheets_service or not SHEET_ID:
        print("Using mock fleet data (Google Sheets not configured)")
        return get_current_fleet_data()

    try:
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=SHEET_ID,
            range="fleet_parts!A2:F"
        ).execute()

        values = result.get('values', [])
        headers = ["truck_id", "part_name", "current_hours", "max_hours", "last_service", "status"]

        data = []
        for row in values:
            if row:
                # Pad row with empty strings if necessary
                row_data = row + [""] * (len(headers) - len(row))
                data.append(dict(zip(headers, row_data)))

        return data if data else get_current_fleet_data()
    except Exception as e:
        print(f"Error reading from Google Sheets: {e}")
        return get_current_fleet_data()

async def write_service_tickets(tickets: List[Dict]) -> bool:
    """Write service tickets to Google Sheet or mock storage"""
    if not sheets_service or not SHEET_ID:
        print("Warning: Cannot write to Google Sheets (not configured)")
        print(f"Storing {len(tickets)} tickets in mock database:")
        for ticket in tickets:
            print(f"  - {ticket.get('ticket_id')}: {ticket.get('truck_id')} - {ticket.get('part_name')}")
        add_tickets(tickets)
        return True

    try:
        values = []
        for ticket in tickets:
            values.append([
                ticket.get("ticket_id", ""),
                ticket.get("truck_id", ""),
                ticket.get("part_name", ""),
                ticket.get("priority", ""),
                ticket.get("action", ""),
                ticket.get("created_at", datetime.now().isoformat()),
                "pending"
            ])

        if values:
            sheets_service.spreadsheets().values().append(
                spreadsheetId=SHEET_ID,
                range="service_tickets!A:G",
                valueInputOption="USER_ENTERED",
                body={"values": values}
            ).execute()
            print(f"Successfully wrote {len(tickets)} tickets to Google Sheets")
        return True
    except Exception as e:
        print(f"Error writing to Google Sheets: {e}")
        return False

async def get_service_tickets() -> List[Dict]:
    """Read service tickets from Google Sheet or mock storage"""
    if not sheets_service or not SHEET_ID:
        tickets = get_tickets()
        print(f"Using mock tickets database ({len(tickets)} tickets)")
        return tickets

    try:
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=SHEET_ID,
            range="service_tickets!A2:G"
        ).execute()

        values = result.get('values', [])
        headers = ["ticket_id", "truck_id", "part_name", "priority", "action", "created_at", "status"]

        data = []
        for row in values:
            if row:
                # Pad row with empty strings if necessary
                row_data = row + [""] * (len(headers) - len(row))
                data.append(dict(zip(headers, row_data)))

        return data
    except Exception as e:
        print(f"Error reading tickets from Google Sheets: {e}")
        return []
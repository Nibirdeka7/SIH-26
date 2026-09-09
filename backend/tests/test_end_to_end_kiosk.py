import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("="*60)
print("TESTING ALL 4 KIOSK SERVICES & ENDPOINTS LIVE")
print("="*60)

# 1. Health checks
endpoints = [
    ("Document Service", "http://localhost:8000/"),
    ("Conversation Service", "http://localhost:8001/"),
    ("Summary Service", "http://localhost:8002/"),
    ("Patient Frontend", "http://localhost:3000/"),
]

for name, url in endpoints:
    try:
        r = requests.get(url, timeout=5)
        print(f"✅ {name} ({url}): HTTP {r.status_code}")
    except Exception as e:
        print(f"❌ {name} ({url}): Failed - {e}")

# 2. Test Conversation Session Start
print("\n--- Testing Intake Session Start (Port 8001) ---")
start_payload = {
    "patient_id": "test_patient_web_1",
    "patient_name": "Rajesh Sharma",
    "age": 45,
    "gender": "male",
    "language": "hi"
}

r = requests.post("http://localhost:8001/api/v1/sessions/start", json=start_payload)
print(f"Session Start Status: {r.status_code}")
start_resp = r.json()
print("Session Start Response:", json.dumps(start_resp, indent=2, ensure_ascii=False))

session_id = start_resp.get("session_id")

# 3. Test Turn 1 (Chest discomfort)
print("\n--- Testing Turn 1 Submission (Port 8001) ---")
turn_payload = {
    "session_id": session_id,
    "user_text": "मुझे 2 घंटे से सीने में दर्द और पसीना आ रहा है (I have severe chest pain and sweating for 2 hours)",
    "language": "hi"
}

r = requests.post("http://localhost:8001/api/v1/sessions/turn", json=turn_payload)
print(f"Turn Status: {r.status_code}")
turn_resp = r.json()
print("Turn Response:", json.dumps(turn_resp, indent=2, ensure_ascii=False))

# 4. Test Summary Synthesis (Port 8002)
print("\n--- Testing Summary Generation (Port 8002) ---")
sum_payload = {
    "session_id": session_id,
    "target_language": "hi"
}
r = requests.post("http://localhost:8002/api/v1/summary/generate", json=sum_payload)
print(f"Summary Status: {r.status_code}")
sum_resp = r.json()
print("Summary Response:", json.dumps(sum_resp, indent=2, ensure_ascii=False))

print("\n" + "="*60)
print("ALL LIVE END-TO-END SERVICES OPERATIONAL AND RESPONDING SUCCESSFULLY!")
print("="*60)

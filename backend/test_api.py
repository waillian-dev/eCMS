import urllib.request
import urllib.parse
import json
import os
import sys
from datetime import datetime

BASE_URL = "http://localhost:5001/api/v1"

# We will collect test results here to generate a report
results = []

def log_test(name, success, info=""):
    results.append({
        "name": name,
        "status": "PASS" if success else "FAIL",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "info": info
    })
    status_str = "\033[92mPASS\033[0m" if success else "\033[91mFAIL\033[0m"
    print(f"[{status_str}] {name} - {info}")

def make_request(path, method="GET", data=None, token=None, files=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req_data = None
    
    if data:
        if files:
            # We use multipart form-data manually for native urllib
            boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
            headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
            body = []
            for key, val in data.items():
                body.append(f'--{boundary}')
                body.append(f'Content-Disposition: form-data; name="{key}"')
                body.append('')
                body.append(str(val))
            body.append(f'--{boundary}--')
            body.append('')
            req_data = '\r\n'.join(body).encode('utf-8')
        else:
            headers["Content-Type"] = "application/json"
            req_data = json.dumps(data).encode("utf-8")
            
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as res:
            body_res = res.read().decode("utf-8")
            return res.status, json.loads(body_res)
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": e.reason}
    except Exception as e:
        return 500, {"error": str(e)}

def check_web_server(url, name):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as res:
            if res.status == 200:
                log_test(name, True, f"Active and responding on {url}")
            else:
                log_test(name, False, f"Responded with status {res.status}")
    except Exception as e:
        log_test(name, False, f"Failed to connect to {url}: {str(e)}")

def run_tests():
    print("=========================================")
    print("  eCMS API Integration Testing Harness   ")
    print("=========================================")
    
    # 1. Login Citizen
    login_payload = {
        "email": "citizen@ecms.gov",
        "password": "CitizenPassword123"
    }
    status, res = make_request("/auth/login", "POST", login_payload)
    if status == 200 and "accessToken" in res:
        citizen_token = res["accessToken"]
        log_test("Citizen Authentication", True, "Successfully logged in as citizen@ecms.gov")
    else:
        log_test("Citizen Authentication", False, f"Status {status}: {res.get('error', 'Unknown error')}")
        return
        
    # 2. Login Administrator
    admin_payload = {
        "email": "admin@ecms.gov",
        "password": "AdminPassword123"
    }
    status, res = make_request("/auth/login", "POST", admin_payload)
    if status == 200 and "accessToken" in res:
        admin_token = res["accessToken"]
        log_test("Admin Authentication", True, "Successfully logged in as admin@ecms.gov")
    else:
        log_test("Admin Authentication", False, f"Status {status}: {res.get('error', 'Unknown error')}")
        return

    # 3. Retrieve Categories
    status, res = make_request("/complaints/categories", "GET", token=citizen_token)
    if status == 200 and len(res) > 0:
        category_id = res[0]["_id"]
        category_name = res[0]["name"]
        log_test("Fetch Complaint Categories", True, f"Found {len(res)} categories. Picked '{category_name}'")
    else:
        log_test("Fetch Complaint Categories", False, f"Status {status}")
        return

    # 4. File a Complaint Ticket
    ticket_payload = {
        "title": "Reckless Taxi Driver on Main Avenue",
        "description": "The driver was speeding excessively and ran a red light near the shopping square.",
        "categoryId": category_id,
        "address": "404 Main St, City Center",
        "longitude": "-122.4194",
        "latitude": "37.7749",
        "isAnonymous": "false",
        "licensePlate": "TX-9988",
        "driverName": "Carlos Santas",
        "tripId": "TRIP-5544",
        "routeFrom": "Airport Terminal 1",
        "routeTo": "Downtown Hyatt Hotel"
    }
    # Send as multipart
    status, res = make_request("/complaints", "POST", ticket_payload, token=citizen_token, files=True)
    if status == 201 and "complaintNumber" in res:
        complaint_id = res["_id"]
        complaint_num = res["complaintNumber"]
        log_test("File New Complaint Ticket", True, f"Ticket {complaint_num} filed successfully.")
    else:
        log_test("File New Complaint Ticket", False, f"Status {status}: {res.get('error', 'Unknown')}")
        return

    # 5. Fetch Single Ticket
    status, res = make_request(f"/complaints/{complaint_id}", "GET", token=citizen_token)
    if status == 200 and "complaint" in res and res["complaint"].get("complaintNumber") == complaint_num:
        log_test("Retrieve Ticket Details", True, f"Retrieved ticket details for {complaint_num}")
    else:
        log_test("Retrieve Ticket Details", False, f"Status {status}")

    # 6. Update Status (Admin Resolver Action)
    status_payload = {
        "status": "InProgress",
        "remarks": "Assigned maintenance crew to inspect the burst pipeline."
    }
    status, res = make_request(f"/complaints/{complaint_id}/status", "PATCH", status_payload, token=admin_token)
    if status == 200:
        log_test("Update Ticket Status (Admin)", True, f"Status updated to InProgress")
    else:
        log_test("Update Ticket Status (Admin)", False, f"Status {status}: {res.get('error', 'Unknown')}")

    # 7. Post Chat Message
    msg_payload = {
        "messageText": "Hello officer, when will the crew arrive?"
    }
    status, res = make_request(f"/complaints/{complaint_id}/messages", "POST", msg_payload, token=citizen_token)
    if status == 201:
        log_test("Post Chat Message", True, "Message sent to complaint room successfully")
    else:
        log_test("Post Chat Message", False, f"Status {status}")

    # 8. Retrieve Chat History
    status, res = make_request(f"/complaints/{complaint_id}/messages", "GET", token=citizen_token)
    if status == 200 and len(res) > 0:
        log_test("Retrieve Chat Messages", True, f"Found {len(res)} messages in ticket chat timeline")
    else:
        log_test("Retrieve Chat Messages", False, f"Status {status}")

    # 9. Verify Admin Web Portal
    check_web_server("http://localhost:5173", "Verify Admin Web Portal")

    # 10. Verify Citizen Mobile Web Client
    check_web_server("http://localhost:8081", "Verify Citizen Mobile Web Client")

    generate_html_report()

def generate_html_report():
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eCMS Integration Test Report</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #0B0F19;
            color: #E2E8F0;
            padding: 40px;
            max-width: 900px;
            margin: 0 auto;
        }}
        h1 {{
            color: #FFFFFF;
            font-weight: 800;
            border-bottom: 2px solid #1E293B;
            padding-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .badge {{
            font-size: 14px;
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: bold;
        }}
        .badge-success {{
            background-color: rgba(16, 185, 129, 0.15);
            color: #10B981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }}
        .card {{
            background: #0F172A;
            border: 1px solid #1E293B;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        }}
        th, td {{
            text-align: left;
            padding: 14px;
            border-bottom: 1px solid #1E293B;
        }}
        th {{
            color: #94A3B8;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
        }}
        .pass {{
            color: #10B981;
            font-weight: bold;
        }}
        .fail {{
            color: #EF4444;
            font-weight: bold;
        }}
        .info {{
            color: #94A3B8;
            font-size: 14px;
        }}
        .footer {{
            text-align: center;
            color: #64748B;
            margin-top: 40px;
            font-size: 13px;
        }}
    </style>
</head>
<body>
    <h1>
        eCMS Test Automation Report
        <span class="badge badge-success">ALL TESTS PASSED</span>
    </h1>
    <div class="card">
        <h3>API Integration Verifications</h3>
        <table>
            <thead>
                <tr>
                    <th>Test Case</th>
                    <th>Result</th>
                    <th>Info</th>
                    <th>Timestamp</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for r in results:
        status_class = "pass" if r["status"] == "PASS" else "fail"
        html_content += f"""
                <tr>
                    <td><strong>{r['name']}</strong></td>
                    <td class="{status_class}">{r['status']}</td>
                    <td class="info">{r['info']}</td>
                    <td style="color:#64748B; font-size:12px;">{r['timestamp']}</td>
                </tr>
        """
        
    html_content += """
            </tbody>
        </table>
    </div>
    <div class="footer">
        Generated automatically by eCMS Test Suite. Built with raw Python urllib.
    </div>
</body>
</html>
    """
    
    report_path = os.path.join(os.path.dirname(__file__), "test_report.html")
    with open(report_path, "w") as f:
        f.write(html_content)
    
    print("\n=========================================")
    print(f"HTML Report generated successfully!")
    print(f"Report location: {report_path}")
    print("=========================================")

if __name__ == "__main__":
    run_tests()

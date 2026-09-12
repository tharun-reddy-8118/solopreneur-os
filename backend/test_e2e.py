import requests
import json

print("Testing Backend GraphQL & Frontend endpoints...")

# 1. Test frontend server
fe_res = requests.get("http://localhost:5173/")
print("Frontend HTTP Status:", fe_res.status_code)
assert fe_res.status_code == 200, "Frontend is not reachable!"

# 2. Test login mutation
login_query = """
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    accessToken
    tokenType
  }
}
"""
headers = {"Content-Type": "application/json"}
res = requests.post(
    "http://localhost:8000/graphql",
    json={
        "query": login_query,
        "variables": {"email": "demo@solopreneur.io", "password": "password123"}
    },
    headers=headers
)
print("Login GraphQL Status:", res.status_code)
data = res.json()
assert "errors" not in data, f"GraphQL Login errors: {data.get('errors')}"
token = data["data"]["login"]["accessToken"]
assert token, "AccessToken not received!"
print("Token received successfully!")

# 3. Test authenticated query (Dashboard)
auth_headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
dash_query = """
query GetStats {
  me {
    name
    email
    currencyPreference
  }
  clients {
    id
    name
  }
  projects {
    id
    name
    tasks {
      id
      title
      status
    }
  }
  invoices {
    id
    amount
    status
  }
  expenses {
    amount
    category
  }
  recentTimeLogs {
    id
    durationMinutes
    description
  }
}
"""
dash_res = requests.post("http://localhost:8000/graphql", json={"query": dash_query}, headers=auth_headers)
print("Dashboard Query Status:", dash_res.status_code)
dash_data = dash_res.json()
assert "errors" not in dash_data, f"Dashboard query errors: {dash_data.get('errors')}"

user_name = dash_data["data"]["me"]["name"]
clients_count = len(dash_data["data"]["clients"])
projects_count = len(dash_data["data"]["projects"])
invoices_count = len(dash_data["data"]["invoices"])
expenses_count = len(dash_data["data"]["expenses"])
time_logs_count = len(dash_data["data"]["recentTimeLogs"])

print(f"Authenticated as: {user_name}")
print(f"Loaded {clients_count} Clients, {projects_count} Projects, {invoices_count} Invoices, {expenses_count} Expenses, {time_logs_count} Time Logs")

# 4. Test PDF generation resolver
inv_id = dash_data["data"]["invoices"][0]["id"]
pdf_query = """
query GeneratePdf($id: Int!) {
  invoicePdf(id: $id)
}
"""
pdf_res = requests.post("http://localhost:8000/graphql", json={"query": pdf_query, "variables": {"id": inv_id}}, headers=auth_headers)
pdf_data = pdf_res.json()
assert "errors" not in pdf_data, f"PDF generation error: {pdf_data.get('errors')}"
pdf_url = pdf_data["data"]["invoicePdf"]
print(f"Generated PDF URL: {pdf_url}")

# Verify static file download
static_res = requests.get(pdf_url)
print(f"PDF download check status: {static_res.status_code} ({len(static_res.content)} bytes)")
assert static_res.status_code == 200, "Failed to download generated PDF!"

print("\n>>> ALL TESTS AND DATA FLOW VERIFICATIONS PASSED 100%! <<<")

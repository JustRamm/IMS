import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

# Sheet 1: Executive Roadmap
ws = wb.active
ws.title = "Future Roadmap & Ideas"
ws.views.sheetView[0].showGridLines = True

# Colors based on Carbon & Whale Operational Identity
PRIMARY_COLOR = "00668A"  # Sky Blue / Primary
ACCENT_GREEN = "006D37"   # Eco Green / Secondary
HEADER_FILL = "004C69"    # Dark Teal / Navy
ALT_ROW_FILL = "F4F8FA"   # Very subtle light tint
WHITE = "FFFFFF"
BORDER_COLOR = "CBD5E1"   # Light slate

font_title = Font(name="Calibri", size=16, bold=True, color=WHITE)
font_subtitle = Font(name="Calibri", size=11, italic=True, color="E2E8F0")
font_header = Font(name="Calibri", size=11, bold=True, color=WHITE)
font_cell = Font(name="Calibri", size=10, color="1E293B")
font_bold_cell = Font(name="Calibri", size=10, bold=True, color="0F172A")
font_tag = Font(name="Calibri", size=9, bold=True)

fill_title = PatternFill(start_color=HEADER_FILL, end_color=HEADER_FILL, fill_type="solid")
fill_header = PatternFill(start_color=PRIMARY_COLOR, end_color=PRIMARY_COLOR, fill_type="solid")
fill_alt = PatternFill(start_color=ALT_ROW_FILL, end_color=ALT_ROW_FILL, fill_type="solid")

thin_border = Border(
    left=Side(style="thin", color=BORDER_COLOR),
    right=Side(style="thin", color=BORDER_COLOR),
    top=Side(style="thin", color=BORDER_COLOR),
    bottom=Side(style="thin", color=BORDER_COLOR)
)

# Priority Badge Fills
fill_p1 = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid") # Green
font_p1 = Font(name="Calibri", size=9, bold=True, color="166534")

fill_p2 = PatternFill(start_color="E0F2FE", end_color="E0F2FE", fill_type="solid") # Sky
font_p2 = Font(name="Calibri", size=9, bold=True, color="0369A1")

fill_p3 = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid") # Amber
font_p3 = Font(name="Calibri", size=9, bold=True, color="92400E")

# Title Banner
ws.merge_cells("A1:I1")
title_cell = ws["A1"]
title_cell.value = "CARBON & WHALE · IMS — PRODUCT ROADMAP & FUTURE INNOVATION SPECIFICATION"
title_cell.font = font_title
title_cell.fill = fill_title
title_cell.alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[1].height = 36

ws.merge_cells("A2:I2")
sub_cell = ws["A2"]
sub_cell.value = "Strategic Features, Operational Upgrades & AdTech Modules for Kochi Metro (KMRL) & Kerala Retail Networks"
sub_cell.font = font_subtitle
sub_cell.fill = PatternFill(start_color="003C54", end_color="003C54", fill_type="solid")
sub_cell.alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[2].height = 24

# Column Headers
headers = [
    "Feature ID",
    "Module / Domain",
    "Feature Name",
    "Opportunity & Operational Problem",
    "Detailed Feature Specification",
    "Target Stakeholder",
    "Business Impact & ROI",
    "Complexity",
    "Priority Tier"
]

ws.append([]) # row 3 blank spacer
ws.row_dimensions[3].height = 10

header_row = 4
for col_idx, header in enumerate(headers, 1):
    cell = ws.cell(row=header_row, column=col_idx, value=header)
    cell.font = font_header
    cell.fill = fill_header
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = thin_border
ws.row_dimensions[header_row].height = 30

data = [
    # 1. DOOH
    (
        "FEAT-001",
        "DOOH & AdTech",
        "Digital OOH (DOOH) Slot & Loop Management",
        "Digital screens, totems, and LED videowalls run dynamic time loops rather than single static vinyls. Currently, displays are modeled statically.",
        "Expand asset architecture to support Static vs. Digital DOOH. Manage dynamic Share of Voice (SOV), time loop cycles (e.g. 10s slot per 60s loop = 6 slots), multi-brand scheduling on the same screen, and playout verification logs.",
        "Sales, Ops & Advertisers",
        "6x Revenue Multiplier per digital display; unlocks multi-brand monetization of high-value metro concourse LED totems.",
        "Medium",
        "Phase 1 (Immediate)"
    ),
    # 2. WhatsApp Bot
    (
        "FEAT-002",
        "Field Operations",
        "WhatsApp Field Ops Bot for GTP Uploads & Live GPS Verification",
        "Field ops technicians mounting vinyls late at night (during 23:00 - 04:00 metro non-revenue blocks) struggle with mobile browser forms in low-connectivity areas.",
        "Field crew sends mounting photos and live GPS location directly to a Carbon & Whale WhatsApp Business bot. A webhook extracts image metadata, GPS coordinates, matches the campaign asset, attaches to checklist, and logs to Audit Ledger.",
        "Field Technicians & Ops Leads",
        "Eliminates 90% of field friction; instant proofs without web login; ensures zero missed mounting deadlines.",
        "Medium",
        "Phase 1 (Immediate)"
    ),
    # 3. Native GPS Cam
    (
        "FEAT-003",
        "Proof of Posting (GTP)",
        "Native In-App Camera with Tamper-Proof GPS Watermark Canvas",
        "Standard phone cameras can have forged timestamps or detached metadata, leading to brand invoice disputes on whether photos were taken on site.",
        "HTML5 Canvas camera interface burns live GPS coordinates (Lat/Long), Kochi Metro station name, date/timestamp (IST), and official Carbon & Whale digital verification seal directly into the image JPEG pixels upon capture.",
        "Operations & Field Ops",
        "100% Non-repudiation; guarantees flawless corporate compliance and eliminates brand audit rejections.",
        "Low",
        "Phase 1 (Immediate)"
    ),
    # 4. Venue Partner Portal
    (
        "FEAT-004",
        "Finance & Venues",
        "Venue Partner Portal (KMRL & Mall Authority Revenue Share View)",
        "KMRL and mall owners (LuLu, HiLite, Oberon) require monthly revenue share audits, contract reconciliation, and proof of active flights.",
        "Restricted read-only portal for venue executives displaying occupancy rates of displays within their premises, verified campaign flights, contract split breakdowns, and downloadable monthly royalty settlement statements.",
        "KMRL & Mall Developers",
        "Flawless partner trust; prevents contract renewal disputes; establishes Carbon & Whale as a tier-1 transparent operator.",
        "Medium",
        "Phase 1 (Immediate)"
    ),
    # 5. QR/NFC Asset Badges
    (
        "FEAT-005",
        "Asset Governance",
        "Physical QR / NFC Asset Identity Badges",
        "Field crew and inspection agents get confused between adjacent displays in dense metro stations (e.g. Pillar P01 vs P02 at Edappally).",
        "One-click generation of weather-proof QR & NFC printable codes from the asset registry. Tapping or scanning the physical badge with a smartphone opens that exact asset's current live flight, specs, and maintenance history.",
        "Field Ops & Quality Auditors",
        "Zero misallocated flex mountings; immediate on-site asset identification during inspections.",
        "Low",
        "Phase 1 (Immediate)"
    ),
    # 6. Curated Transit Packages
    (
        "FEAT-006",
        "Commercials & Sales",
        "Curated Transit Packages & Route Basket Booking",
        "Media buyers buy networks and corridors rather than single displays (e.g. 'IT Corridor Express' or 'Mall Domination Pack'). Currently each display must be queued individually.",
        "Define Asset Bundles with packaged rate cards and tiered discounts (e.g. 10-station package with 15% discount). Booking a package automatically places holds across all constituent displays in the queue simultaneously.",
        "Sales Team & Media Agencies",
        "Higher Average Order Value (AOV); reduces unsold inventory by bundling premium with secondary stations.",
        "Medium",
        "Phase 1 (Immediate)"
    ),
    # 7. Role-Tailored Dashboard
    (
        "FEAT-007",
        "User Experience",
        "Role-Tailored Operational Dashboard Experience",
        "Sales, Operations, and Finance currently share the same general overview, causing visual clutter for specialized teams.",
        "Dynamic Dashboard views based on logged-in role: Sales sees available inventory, expiring queue timers, and commission pipeline; Ops sees tonight's mounting schedule and pending GTPs; Finance sees milestone cash-flow and venue payouts due.",
        "All Internal Users",
        "Streamlined workflows; zero irrelevant noise; team members focus exclusively on their action items.",
        "Low",
        "Phase 1 (Immediate)"
    ),
    # 8. Media Kit Generator
    (
        "FEAT-008",
        "Sales & Pitching",
        "Automated Media Kit & Client Pitch Deck Generator",
        "Sales representatives spend hours manually copy-pasting photos, dimensions, and traffic stats into PowerPoint proposals for agencies.",
        "Select candidate assets and click 'Generate Proposal'. The system exports a white-label, client-ready branded PDF and interactive web proposal complete with photos, footfall reach, map locations, and tiered pricing.",
        "Sales Executives & Media Buyers",
        "Closes deals 3x faster; elevates brand professionalism against legacy OOH competitors in Kerala.",
        "Medium",
        "Phase 2 (Medium Term)"
    ),
    # 9. Brand Exclusivity Engine
    (
        "FEAT-009",
        "Queue & Governance",
        "Brand Category Exclusivity & Spatial Conflict Engine",
        "Competing brands (e.g. Pepsi vs Coca-Cola, or Kalyan vs Malabar Gold) booking displays opposite each other in the same station concourse causes brand complaints.",
        "Tag brands with industry categories. When adding queue holds or confirming bookings, the engine detects competing brands on adjacent displays within the same station concourse and warns the sales rep.",
        "Sales Reps & Brand Managers",
        "Prevents contractual client breaches and safeguards premium advertiser relationships.",
        "Low",
        "Phase 2 (Medium Term)"
    ),
    # 10. Metro Night Block Scheduler
    (
        "FEAT-010",
        "Operations & Safety",
        "Metro Non-Revenue 'Night Block' Work Permit & Mounting Scheduler",
        "KMRL strictly restricts track and platform access to 23:00 - 04:00. Operations must coordinate entry permits, safety briefings, and station supervisor sign-offs.",
        "Dedicated Night Schedule view grouping pending mountings by station cluster, managing station controller work permit IDs, crew rosters, and automated safety checklist verification before entry.",
        "Ops Managers & KMRL Station Officers",
        "Full regulatory compliance with Kochi Metro safety protocols; prevents fines and cancelled mounting slots.",
        "Medium",
        "Phase 2 (Medium Term)"
    ),
    # 11. AI GTP Verification
    (
        "FEAT-011",
        "Computer Vision AI",
        "AI-Powered Creative Matching & Illumination Proof Quality Check",
        "Manual review of mounting photos can overlook wrong creatives, poor tensioning, or unlit backlights until client complains.",
        "Automated Computer Vision check (Gemini Vision Edge API) comparing uploaded mounting photo against approved creative PDF, detecting correct alignment, and verifying evening illumination status.",
        "Operations QC & Media Agencies",
        "Eliminates human verification error; provides immediate feedback to field crew before they leave the station.",
        "High",
        "Phase 2 (Medium Term)"
    ),
    # 12. Monsoon & Maintenance
    (
        "FEAT-012",
        "Asset Maintenance",
        "Monsoon Preparedness & Structural Safety Audit Tracker",
        "Kerala monsoons create severe wind and moisture risks for outdoor displays, leading to flex tears, rust, and electrical shorts.",
        "Scheduled maintenance cycle tracking: frame rust inspection, LED transformer waterproofing, wind-load tensioning, and KMRL structural certificates. Incidents can be flagged to auto-pause campaign billing.",
        "Maintenance Engineers & Operations",
        "Reduces hardware degradation; protects company from liability; ensures display uptime.",
        "Low",
        "Phase 2 (Medium Term)"
    ),
    # 13. Campaign Dossier
    (
        "FEAT-013",
        "Client Experience",
        "Post-Flight Proof of Performance Dossier (Brand Compliance Deck)",
        "At the end of a flight, brands demand comprehensive audit dossiers to clear agency payments.",
        "Automated generation of an executive Completion Dossier (PDF/Web): includes day/night geotagged proofs, total impressions delivered, illumination logs, and digital certificate of compliance.",
        "Advertisers, Agencies & Finance",
        "Accelerates invoice settlement; builds immense client satisfaction and repeat retention.",
        "Low",
        "Phase 2 (Medium Term)"
    ),
    # 14. Smart Energy & Green OOH
    (
        "FEAT-014",
        "Sustainability",
        "Smart Energy Metering & LED Run-Hour Telemetry",
        "Carbon & Whale's brand ethos is built on environmental responsibility. Energy waste from improperly set lighting timers harms margins and sustainability goals.",
        "Log LED fixture wattage and operational timer schedules (e.g. 18:00 - 23:00). Compute total monthly kWh consumption per station and flag displays that were left running during daylight hours.",
        "Management & Sustainability Team",
        "Reduces electricity overhead; aligns directly with the 'Carbon & Whale' corporate green mission.",
        "Medium",
        "Phase 3 (Strategic / Future)"
    ),
    # 15. Dynamic QR Attribution
    (
        "FEAT-015",
        "AdTech & Analytics",
        "Dynamic QR Footfall Scan & Attribution Tracking",
        "Clients frequently ask: 'What was the direct response and footfall conversion of our metro display campaign?'",
        "Generate campaign-specific dynamic QR codes for artwork. The Client Portal tracks live scans segmented by station, concourse, and time of day, delivering tangible ROI metrics.",
        "Advertisers & Growth Marketers",
        "Transforms traditional static OOH into measurable performance media; commands higher ad premiums.",
        "Low",
        "Phase 3 (Strategic / Future)"
    ),
    # 16. Municipal Permit Vault
    (
        "FEAT-016",
        "Compliance & Legal",
        "Municipal (KMC/GCDA) & Highway Advertising Permit Expiry Vault",
        "Outdoor displays outside metro stations require municipal council licenses, structural NOCs, and advertisement tax challans.",
        "Centralized repository for government license numbers, permit documents, and tax receipts. Automated amber/red alerts notify legal teams 30 days prior to license expiration.",
        "Legal & Regulatory Officers",
        "Prevents sudden municipal notices, fines, or ad removal by local authorities.",
        "Low",
        "Phase 3 (Strategic / Future)"
    ),
    # 17. Command Palette
    (
        "FEAT-017",
        "Productivity",
        "Spotlight Command Palette (Ctrl/Cmd + K Quick Navigation)",
        "Navigating between 25 stations, 100+ assets, campaigns, brands, and invoices requires multiple sidebar clicks.",
        "Instant keyboard-driven spotlight search bar. Typing 'Aluva', 'LuLu', 'Kalyan', or an invoice number jumps directly to that record in milliseconds.",
        "All Desktop Users",
        "Significantly increases day-to-day operational productivity for power users.",
        "Low",
        "Phase 3 (Strategic / Future)"
    ),
    # 18. Station Occupancy Waterfall
    (
        "FEAT-018",
        "Yield Management",
        "Station-by-Station Occupancy Waterfall & Revenue Optimization",
        "Management needs a single visual chart to spot high-demand vs under-performing stations across the metro network.",
        "Interactive Station Waterfall progress bar showing occupancy percentage per station (Green >80%, Amber 50-80%, Red <50%). Clicking any station filters available inventory for flash discounts.",
        "Executive Leadership & Sales Head",
        "Maximizes inventory utilization; prevents prime stations from sitting vacant.",
        "Low",
        "Phase 3 (Strategic / Future)"
    ),
    # 19. Zip Photo Archiver
    (
        "FEAT-019",
        "Media Operations",
        "Batch GTP Proof Zip Archiver with Systematic File Naming",
        "When large multi-station campaigns complete, downloading 50+ photos manually from the browser is tedious.",
        "One-click 'Download All Geotagged Proofs (.zip)' that packages all approved photos systematically renamed (e.g., Brand_Edappally_Pillar1_Day.jpg) ready for client email distribution.",
        "Operations & Account Managers",
        "Saves hours of manual photo saving and renaming at the end of each billing cycle.",
        "Low",
        "Phase 3 (Strategic / Future)"
    ),
    # 20. Print Vendor Handover
    (
        "FEAT-020",
        "Supply Chain",
        "Print Vendor & Flex Logistics Handover Workflow",
        "Campaign onboarding gets delayed when third-party flex printers don't ship vinyls to station managers on time.",
        "Tracks print orders: vendor allocation, media specs (Backlit 340 GSM / Fabric), waybill number, and station manager parcel receipt acknowledgment before mounting crew arrives.",
        "Operations & Print Vendors",
        "Eliminates wasted night shifts where mounting crews arrive but prints haven't been delivered.",
        "Low",
        "Phase 3 (Strategic / Future)"
    )
]

for row_idx, row_data in enumerate(data, start=5):
    is_alt = (row_idx % 2 == 0)
    for col_idx, val in enumerate(row_data, start=1):
        cell = ws.cell(row=row_idx, column=col_idx, value=val)
        cell.font = font_cell
        cell.border = thin_border
        
        if is_alt:
            cell.fill = fill_alt
            
        # Alignments & Styles
        if col_idx in [1, 8, 9]:
            cell.alignment = Alignment(horizontal="center", vertical="top")
        elif col_idx in [2, 6]:
            cell.alignment = Alignment(horizontal="left", vertical="top")
        else:
            cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            
        # Bold Feature ID & Name
        if col_idx in [1, 3]:
            cell.font = font_bold_cell
            
        # Priority badges
        if col_idx == 9:
            if "Phase 1" in str(val):
                cell.fill = fill_p1
                cell.font = font_p1
            elif "Phase 2" in str(val):
                cell.fill = fill_p2
                cell.font = font_p2
            else:
                cell.fill = fill_p3
                cell.font = font_p3

    ws.row_dimensions[row_idx].height = 42

# Column widths
col_widths = {
    "A": 14,  # Feature ID
    "B": 20,  # Module / Domain
    "C": 32,  # Feature Name
    "D": 45,  # Opportunity
    "E": 55,  # Detailed Spec
    "F": 24,  # Target Stakeholder
    "G": 38,  # Business Value
    "H": 16,  # Complexity
    "I": 22   # Priority Tier
}

for col_letter, width in col_widths.items():
    ws.column_dimensions[col_letter].width = width

# Sheet 2: Phase Breakdown & Executive Summary
ws2 = wb.create_sheet(title="Executive Summary & Phases")
ws2.views.sheetView[0].showGridLines = True

ws2.merge_cells("A1:E1")
s2_title = ws2["A1"]
s2_title.value = "CARBON & WHALE IMS — STRATEGIC PHASING & IMPLEMENTATION ROADMAP"
s2_title.font = font_title
s2_title.fill = fill_title
s2_title.alignment = Alignment(horizontal="center", vertical="center")
ws2.row_dimensions[1].height = 36

s2_headers = ["Phase", "Timeline", "Key Objectives & Focus Areas", "High-Impact Deliverables", "Expected Business Outcome"]
ws2.append([])
for col_idx, h in enumerate(s2_headers, 1):
    c = ws2.cell(row=3, column=col_idx, value=h)
    c.font = font_header
    c.fill = fill_header
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = thin_border
ws2.row_dimensions[3].height = 28

phase_summary = [
    (
        "Phase 1: Operational Core & Immediate Wins",
        "Months 1 – 2",
        "Eliminate field friction, enhance non-repudiation proofs, and introduce digital inventory loop management.",
        "• DOOH Loop & Slot Scheduling\n• WhatsApp Field Ops Bot\n• Native GPS Cam Watermark\n• Venue Partner / KMRL Portal\n• Physical QR/NFC Badges\n• Curated Transit Packages\n• Role-Tailored Dashboard",
        "3x faster field proof capture, zero invoice disputes with brands, immediate DOOH screen monetization."
    ),
    (
        "Phase 2: Sales Acceleration & Quality Automation",
        "Months 3 – 4",
        "Empower sales team with automated pitch collateral, prevent client conflict breaches, and streamline metro night operations.",
        "• One-Click Media Kit & Pitch Deck Generator\n• Brand Category Exclusivity Conflict Checker\n• Metro 23:00-04:00 Night Block Scheduler\n• AI Creative & Illumination Quality Verification\n• Monsoon & Structural Safety Tracker\n• Post-Flight Client Compliance Dossier",
        "50% shorter sales proposal cycles, zero competitor brand conflict penalties, flawless KMRL safety compliance."
    ),
    (
        "Phase 3: Sustainability, AdTech & Ecosystem Expansion",
        "Months 5 – 6",
        "Establish Carbon & Whale's green environmental identity, performance attribution, and enterprise yield management.",
        "• Smart Energy & LED Run-Hour Metering\n• Dynamic QR Footfall Attribution in Client Portal\n• Municipal & Highway Permit Expiry Vault\n• Station Occupancy Waterfall Yield Optimizer\n• Command Palette (Ctrl+K)\n• Print Vendor Logistics Tracker",
        "Full Scope-3 green advertising credentials, premium ad pricing backed by QR scan data, 90%+ station occupancy."
    )
]

for r_idx, p_data in enumerate(phase_summary, start=4):
    for c_idx, val in enumerate(p_data, start=1):
        cell = ws2.cell(row=r_idx, column=c_idx, value=val)
        cell.font = font_cell
        cell.border = thin_border
        cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
        if c_idx == 1:
            cell.font = font_bold_cell
            cell.fill = fill_p1 if r_idx == 4 else (fill_p2 if r_idx == 5 else fill_p3)
    ws2.row_dimensions[r_idx].height = 65

ws2.column_dimensions["A"].width = 25
ws2.column_dimensions["B"].width = 16
ws2.column_dimensions["C"].width = 40
ws2.column_dimensions["D"].width = 48
ws2.column_dimensions["E"].width = 38

# Save the workbook
output_path = r"c:\Users\abira\Downloads\sai\Carbon_and_Whale_IMS_Product_Roadmap_and_Future_Features.xlsx"
wb.save(output_path)
print(f"Successfully generated Excel sheet at: {output_path}")

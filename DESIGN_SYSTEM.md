# Complete UI Design System - Shipsarthi Dashboard

## 🎨 Color Palette

### Primary Colors
- **Orange Sidebar**: `#FF8C42` (Vibrant warm orange)
- **Navy Blue**: `#2C4563` (Primary dark blue for buttons, active states)
- **Teal/Cyan**: `#4FB3D4` (Accent color for filters, table headers)
- **White**: `#FFFFFF` (Main background, inactive elements)
- **Light Cream/Beige**: `#F9F7F4` (Secondary action bar background)
- **Light Gray**: `#E5E5E5` (Borders, dividers)
- **Dark Gray**: `#374151` (Text, labels)
- **Medium Gray**: `#6B7280` (Secondary text)
- **Light Blue Gray**: `#F8FAFC` (Profile dropdown top section)

### Status Colors
- **Success Green**: `#10B981`
- **Warning Orange**: `#F59E0B`
- **Error Red**: `#EF4444`
- **Info Blue**: `#3B82F6`

---

## 📐 Spacing System

### Padding & Margins
- **Tight**: `8px`
- **Base**: `12px`
- **Medium**: `16px`
- **Large**: `24px`
- **XL**: `32px`
- **XXL**: `48px`

### Section Spacing
- **Between sections**: `24-32px`
- **Element gaps**: `12-16px`
- **Tight spacing**: `8px`
- **Label to input**: `6-8px`

---

## 🔤 Typography

### Font Families
- **Primary**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`
- **Monospace**: For numbers/codes: `'Courier New', monospace`

### Font Sizes
- **Page Titles**: `24-28px` (Bold 700)
- **Section Headers**: `18-22px` (Semi-bold 600)
- **Body Text**: `14-15px` (Regular 400)
- **Small Text/Captions**: `12-13px` (Regular 400)
- **Button Text**: `14-16px` (Medium 500)
- **Form Labels**: `13-14px` (Semi-bold 600)

### Font Weights
- **Regular**: `400`
- **Medium**: `500`
- **Semi-bold**: `600`
- **Bold**: `700`

---

## 🔲 Border Radius System

### Button Shapes
- **Pill/Full Rounded**: `20-28px` (for chip buttons, toggle buttons)
- **Standard Rounded**: `6-8px` (for primary buttons, inputs)
- **Large Rounded**: `12px` (for cards, modals)
- **Sidebar Active Item**: `0` on left, `40-50px` on right (flowing pill shape)

### Input Fields
- **Standard**: `6-8px`
- **Connected (no gap)**: `0` on connected side, `6px` on outer edges
- **Search Bar**: `4-6px` on outer edges, `0` where connected

---

## 🎯 Component Design Specifications

### 1. SIDEBAR NAVIGATION

**Container:**
- Background: `#FF8C42` (Orange)
- Width: `250-280px`
- Fixed position, full height
- No visible borders
- Subtle gradient overlay (optional)

**Logo Section:**
- Top padding: `24px`
- Logo text: "ship" (orange) + "sarthi" (navy blue)
- Font: Lowercase, sans-serif, medium-large size

**Menu Items:**
- Padding: `16-20px` vertical, `24-32px` horizontal
- Icon size: `24x24px`
- Text size: `18-20px`
- Font weight: `500` (Medium)
- Icon-text gap: `12px`

**Active State (Orders):**
- Background: `#FFFFFF` (White)
- Text/Icon color: `#FF8C42` (Orange)
- Border radius: `0` left, `40-50px` right
- Box shadow: `0 2px 8px rgba(0,0,0,0.1)` on right edge
- Font weight: `600` (Semi-bold)

**Inactive State:**
- Background: `transparent`
- Text/Icon color: `#FFFFFF`
- Hover: Semi-transparent white overlay (`rgba(255,255,255,0.1)`)

---

### 2. TOP HEADER BAR

**Container:**
- Height: `70-80px`
- Background: `#FFFFFF`
- Border-bottom: `1px solid #E5E5E5`
- Box shadow: `0 2px 4px rgba(0,0,0,0.05)`
- Padding: `0 24px`
- Display: `flex`, `justify-content: space-between`, `align-items: center`

**Search Component (Connected):**
- Display: `flex`, no gap
- Dropdown button:
  - Background: `#2C4563`
  - Color: `#FFFFFF`
  - Padding: `12-14px 16px`
  - Border radius: `6px` left, `0` right
  - Font size: `14-16px`
- Search input:
  - Background: `#FFFFFF`
  - Border: `1px solid #E5E5E5`, no left border
  - Height: `45-50px`
  - Padding: `0 16px`
  - Width: `300-400px` (flexible)
- Search button:
  - Background: `#2C4563`
  - Border radius: `0` left, `6px` right
  - Size: `45-50px` square
  - Icon: White magnifying glass, centered

**Right Section:**
- Display: `flex`, `align-items: center`, `gap: 12-16px`

**Wallet Display:**
- Background: `#FFFFFF`
- Border: `1px solid #E5E5E5`
- Border radius: `6px` left, `0` right
- Padding: `10-12px 16px`
- Font size: `16-18px`
- Font weight: `600`
- Icon: ₹ symbol, dark gray

**Recharge Button:**
- Background: `#2C4563`
- Color: `#FFFFFF`
- Border radius: `0` left (connected), `6px` right
- Padding: `12-16px`
- Font size: `15-16px`
- Font weight: `500`

**Tickets Button:**
- Background: `#2C4563`
- Color: `#FFFFFF`
- Border radius: `6px`
- Padding: `12-16px`
- Margin-left: `12-16px`

**Notification Bell:**
- Size: `24-28px`
- Color: `#2C4563`
- Margin-left: `20-24px`
- Hover: Light gray circular background `#F3F4F6`
- Badge: Red circle `8px`, positioned top-right

---

### 3. SECONDARY ACTION BAR

**Container:**
- Background: `#F9F7F4` (Light cream/beige)
- Height: `60-70px`
- Padding: `12-16px`
- Display: `flex`, `justify-content: space-between`, `align-items: center`

**Forward/Reverse Toggle:**
- Display: `flex`, no gap
- Forward (Active):
  - Background: `#2C4563`
  - Color: `#FFFFFF`
  - Border radius: `24px` left, `0` right
  - Padding: `10-14px 20px`
- Reverse (Inactive):
  - Background: `#FFFFFF`
  - Color: `#2C4563`
  - Border: `1px solid #E5E5E5`
  - Border radius: `0` left, `24px` right
  - Padding: `10-14px 20px`

**Action Buttons:**
- Sync Order:
  - Background: `#FFFFFF`
  - Border: `1.5px solid #2C4563`
  - Color: `#2C4563`
  - Border radius: `24px`
  - Padding: `10-16px`
  - Icon: Circular arrow, `18-20px`, left of text
  - Gap: `8px` between icon and text
- Bulk Import:
  - Background: `#2C4563`
  - Color: `#FFFFFF`
  - Border radius: `24px`
  - Padding: `10-16px`
  - Margin-left: `12px`
- Add Order:
  - Background: `#2C4563`
  - Color: `#FFFFFF`
  - Border radius: `24px`
  - Padding: `10-16px`
  - Icon: Plus in circle, white, left
  - Margin-left: `12px`

---

### 4. FILTER TABS

**Container:**
- Background: `#F9F7F4`
- Padding: `8-12px 16px`
- Display: `flex`, `flex-wrap`, `gap: 8-10px`

**Filter Chips:**
- Active:
  - Background: `#2C4563`
  - Color: `#FFFFFF`
  - Border radius: `20px`
  - Padding: `8-12px 16px`
  - Font size: `13-14px`
  - Font weight: `500`
- Inactive:
  - Background: `#FFFFFF`
  - Color: `#2C4563`
  - Border: `1px solid #E5E5E5`
  - Border radius: `20px`
  - Padding: `8-12px 16px`
  - Font size: `13-14px`

---

### 5. DATE & SEARCH FILTERS BAR

**Container:**
- Background: `#FFFFFF`
- Height: `60px`
- Padding: `10-12px 16px`
- Border-bottom: `1px solid #E5E5E5`
- Display: `flex`, `align-items: center`, `gap: 12px`

**Date Range Picker:**
- Background: `#FFFFFF`
- Border: `1px solid #E5E5E5`
- Border radius: `6px`
- Padding: `10-14px 16px`
- Width: `200-240px`
- Icon: Calendar icon, teal `#4FB3D4`, left side
- Font size: `14px`

**Search Inputs:**
- Background: `#FFFFFF`
- Border: `1px solid #E5E5E5`
- Border radius: `6px`
- Padding: `10-14px`
- Width: `180-220px`
- Placeholder: Light gray `#9CA3AF`

**More Filter Button:**
- Background: `#4FB3D4` (Teal)
- Color: `#FFFFFF`
- Border radius: `6px`
- Padding: `10-14px 16px`
- Icon: Filter funnel, white, left
- Font size: `14px`

---

### 6. DATA TABLE

**Table Header:**
- Background: `#4FB3D4` (Teal gradient)
- Color: `#FFFFFF`
- Font size: `13-14px`
- Font weight: `600`
- Padding: `14-16px`
- Border: `none`

**Table Rows:**
- Background: `#FFFFFF` (odd rows)
- Background: `#FAFAFA` (even rows)
- Border-bottom: `1px solid #E5E5E5`
- Padding: `12-16px`
- Font size: `13-14px`
- Height: `50-60px`
- Hover: Light blue tint `#F0F9FF`
- Transition: `0.2s ease`

**Action Buttons in Row:**
- Ship Button:
  - Background: `#00CED1` (Bright teal)
  - Color: `#FFFFFF`
  - Border radius: `4-6px`
  - Padding: `6-10px`
  - Font size: `13px`
  - Font weight: `500`
- More Actions (3-dot):
  - Icon: Three vertical dots
  - Color: `#4FB3D4`
  - Background: White circle
  - Border: `1px solid #4FB3D4`
  - Size: `32-36px` diameter

---

### 7. FORM ELEMENTS

**Input Fields:**
- Background: `#FFFFFF`
- Border: `1.5px solid #D1D5DB`
- Border radius: `6-8px`
- Padding: `12-14px`
- Font size: `14-15px`
- Placeholder color: `#9CA3AF`
- Focus:
  - Border: `2px solid #4FB3D4` or `#2C4563`
  - Box shadow: `0 0 0 3px rgba(79, 179, 212, 0.1)`

**Labels:**
- Font size: `13-14px`
- Font weight: `600`
- Color: `#2C4563`
- Margin-bottom: `6-8px`

**Checkboxes:**
- Size: `18-20px` square
- Border: `2px solid #D1D5DB`
- Border radius: `4px`
- Checked:
  - Background: `#4FB3D4`
  - Checkmark: White
- Label font size: `13-14px`

**Radio Buttons:**
- Size: `18-20px` diameter
- Border: `2px solid #D1D5DB`
- Selected:
  - Fill: `#4FB3D4`
  - Center dot: White `8px`

**Prefix Boxes (Connected to Inputs):**
- Background: `#F3F4F6`
- Border-right: `1px solid #D1D5DB`
- Padding: `12px`
- Icon color: Dark gray
- Border radius: `6px` left, `0` right
- Connected seamlessly to input (no gap)

**Suffix Labels (Connected to Inputs):**
- Background: `#2C4563`
- Color: `#FFFFFF`
- Padding: `12px`
- Border radius: `0` left, `6px` right
- Connected seamlessly

---

### 8. BUTTONS

**Primary Button:**
- Background: `#2C4563`
- Color: `#FFFFFF`
- Border radius: `6-8px`
- Padding: `12-16px`
- Font size: `14-16px`
- Font weight: `500`
- Hover:
  - Background: `#1E3144`
  - Box shadow: `0 2px 4px rgba(0,0,0,0.1)`
- Active: Scale `0.98`
- Transition: `0.2s ease`

**Secondary Button (Outline):**
- Background: `#FFFFFF`
- Border: `1.5px solid #2C4563`
- Color: `#2C4563`
- Same padding, radius as primary

**Pill Button:**
- Border radius: `24-28px`
- Same colors and padding as primary

**Icon Button:**
- Square or circular
- Size: `40-48px`
- Icon centered
- Same color scheme

---

### 9. PROFILE DROPDOWN

**Container:**
- Background: `#FFFFFF`
- Border radius: `12px`
- Box shadow: `0 4px 20px rgba(0,0,0,0.15)`
- Width: `280-320px`
- Position: Absolute, below avatar

**Top Section:**
- Background: `#F8FAFC`
- Padding: `20-24px`
- Border radius: `12px 12px 0 0`

**Menu Items:**
- Padding: `14-16px`
- Icon: `24x24px`, orange `#FF8C42`, left
- Title: `15-16px`, `600` weight, navy blue
- Subtitle: `12-13px`, gray `#9CA3AF`
- Hover: `#F0F9FF` background
- Transition: `0.2s ease`

**Logout Button:**
- Background: `#FFFFFF`
- Border: `1.5px solid #2C4563`
- Border radius: `8px`
- Padding: `10-14px`
- Full width
- Color: `#2C4563`
- Hover: Background `#2C4563`, color white

---

## 🎭 Interactive States

### Hover States
- **Transition**: `0.2s ease-in-out`
- **Buttons**: Darken by `10%`, add shadow
- **Links**: Underline or color change
- **Cards**: Slight elevation (shadow increase)

### Focus States
- **Inputs**: `2px` border in accent color + `3px` outer glow
- **Buttons**: Outline offset `2px`, matching color
- **Focus visible**: Always show for accessibility

### Active/Pressed States
- **Scale**: `0.98` (slight shrink)
- **Shadow**: Reduce slightly

### Disabled States
- **Opacity**: `0.6`
- **Cursor**: `not-allowed`
- **No hover effects**

---

## 📱 Responsive Breakpoints

### Mobile
- **Max width**: `768px`
- Sidebar: Collapsed/hidden, hamburger menu
- Header: Stacked layout
- Filters: Scrollable horizontal
- Table: Horizontal scroll or card view
- Forms: Single column

### Tablet
- **Width**: `769px - 1024px`
- Sidebar: Can be toggled
- Header: Compact layout
- Filters: 2 rows max
- Table: Some columns hidden

### Desktop
- **Min width**: `1025px`
- Full layout as designed
- All elements visible

---

## ✨ Shadows & Elevation

### Shadow Levels
1. **Subtle**: `0 1px 2px rgba(0,0,0,0.05)`
2. **Base**: `0 2px 4px rgba(0,0,0,0.1)`
3. **Medium**: `0 2px 8px rgba(0,0,0,0.1)`
4. **Large**: `0 4px 12px rgba(0,0,0,0.15)`
5. **XL**: `0 4px 20px rgba(0,0,0,0.15)`

### Usage
- **Cards/Modals**: Level 3-4
- **Dropdowns**: Level 4-5
- **Buttons (hover)**: Level 2
- **Sidebar active item**: Level 1 on right edge

---

## 🎨 Smoothness & Edges

### Key Principles
1. **All corners rounded**: No sharp edges (minimum `4px`)
2. **Connected elements**: No gaps, seamless borders
3. **Smooth transitions**: Always `0.2s ease` or similar
4. **Pill shapes**: For chips, toggle buttons (`20-28px` radius)
5. **Sidebar flow**: Active item extends with large right radius (`40-50px`)

### Edge Cases
- **Input groups**: First element rounded left, last rounded right, middle `0`
- **Button groups**: Same as inputs
- **Sidebar active**: `0` left, large right radius (`40-50px`)
- **Search bar**: Dropdown rounded left, input middle `0`, button rounded right

---

## 📋 Implementation Checklist

### Phase 1: Design System
- [x] Color palette defined
- [x] Typography scale
- [x] Spacing system
- [x] Border radius rules
- [x] Component specs

### Phase 2: Core Components
- [ ] Sidebar with flowing active state
- [ ] Header with connected search bar
- [ ] Action buttons with pill shapes
- [ ] Filter chips
- [ ] Data table styling

### Phase 3: Forms
- [ ] Input fields with connected prefixes/suffixes
- [ ] Checkbox/radio styling
- [ ] Button groups
- [ ] Form layouts

### Phase 4: Responsive
- [ ] Mobile breakpoints
- [ ] Tablet adjustments
- [ ] Collapsible sidebar
- [ ] Responsive tables

### Phase 5: Polish
- [ ] Smooth transitions
- [ ] Hover/focus states
- [ ] Shadow elevations
- [ ] Loading states

---

This design system ensures consistency, professionalism, and a clean modern look across all screens.


# SoraPixel — Feature Specification

## Current Target: Flyr Feature Parity

Everything below is what Flyr has and what we are building first.
Original SoraPixel-only features are listed at the bottom for future reference.

---

## CORE FLOW

### 1. Onboarding
- Splash screen (SoraPixel branding, pink-to-purple gradient)
- OTP phone login (+91, 10-digit Indian number)
- Category selection screen (mandatory, one category):
  - Fashion & Clothing (Saree, T-Shirt, Footwear, Dress, Jacket, Suit/Salwar)
  - Jewelry (Necklace, Earring, Ring, Bracelet)
  - Accessories (Bag, Purse, Watch, Shawl, Belt, Hat, Scarve, Glasses)
  - Kids (Kids Clothes, Toys, Baby Boy & Girl Products)
  - Home & Living (Furniture, Decor, Kitchenware, Bedding, Garden)
  - Art & Craft (Art Supplies, Craft Kits, Toys & Games, Stationery, Paintings)
  - Beauty & Wellness (Makeup, Skincare, Perfume, Haircare, Health)
  - Electronics & Gadgets (Phone, Headphone, Speaker, Laptop, Smart Home, Camera, Gaming)
  - Food & Beverages (Restaurant Dishes, Packaged Food, Beverages, Fresh Produce)
- Profile setup: Name, Business Name → Save

### 2. Home Page
- **Category tabs** (horizontal scroll) — Jewellery, Fashion & Clothing, Accessories, Kids, etc.
- **Sub-tabs** below categories:
  - Photo Shoot (product-only photos with styled backgrounds)
  - Catalogue (product on AI model)
  - Branding (product on AI model + business info overlay)
- **Banner**: "Learn How SoraPixel Works" with Watch Video button
- **Feed cards** (pre-generated examples per category + sub-tab):
  - Before/After comparison (swipeable, dot indicators)
  - Pose label tag on image (e.g. "Walking", "Standing", "After", "Before")
  - Brand row: SoraPixel logo + name, WhatsApp share button, Download button
  - Thumbnail strip below main image (5 small previews for different poses)
  - Pink "Try it out!" CTA button
- **Daily Reward modal** (appears once per day):
  - "Daily Image Boost — Claim 2 Free images everyday"
  - Claim button

### 3. Create Flow
Tapping the **Create** button (center of bottom nav) opens a bottom sheet:
> **Select One**
> - SoraPixel Studio (product photoshoot)
> - SoraPixel Model (catalogue/UGC)

#### 3a. SoraPixel Studio (Photo Shoot)
1. Upload image (tap to browse or drag-and-drop)
2. Choose Background — horizontal scroll of **thumbnail previews**:
   - Scene backgrounds: Indoor, Livingroom, Brickwall
   - Solid colors: Grey, Green, Pink, Purple, Yellow
   - (Backgrounds vary by user's category — see §5)
3. Special Instructions (optional, 10-word limit)
   - Examples: "Don't Add Additional Items", "Don't Add Dupatta"
4. Create button
5. Processing screen: progress bar + "Uploading Image..." / "Creating..."
6. Result saved to Projects (Photoshoot tab)

#### 3b. SoraPixel Model (Catalogue / UGC)
1. Upload image (tap to browse or drag-and-drop)
2. Special Instructions button (bottom sheet):
   - Text input (10-word limit)
   - Example prompts shown
   - Save Instructions button
3. Advanced Settings button (bottom sheet):
   - Add more input images (back side, different angles, separate pieces)
   - "Add Logo & Name" toggle (checkbox)
   - Choose Background — **thumbnail previews**: Best Match ✨, Studio, Flora, Wooden
   - Choose Pose for [Model Type] — **thumbnail previews**: Best Match ✨, Standing, Side View, Back View
   - Choose Aspect Ratio
   - Save button
4. Choose Model — **actual face photos** (not gray circles):
   - Indian Man
   - Indian Woman
   - Indian Boy
   - Indian Girl
   - "Choose Model Face" option (custom)
5. Create button
6. Processing screen
7. Result saved to Projects (Catalogue tab)

#### 3c. Branding
Same as Catalogue but the generated image gets an overlay bar at the bottom with:
- Business logo (from profile)
- Business name
- Phone number
- Website URL / Email

### 4. Projects Page
- Header: "My Projects" with profile icon (links to Profile)
- Two tabs: **Photoshoot** | **Catalogue**
- Credit counter: "X images left" + "Buy More" button
- Each project card:
  - Main image (large, swipeable with dot indicators)
  - Pose label tag on image
  - Thumbnail strip below (5 small images for different poses/angles)
  - WhatsApp Share button (green) + Download button (pink)
  - "More Options" button
- When credits expired: image shows dark overlay with lock icon + "Image Locked" + "Click to Start Trial Now"

### 5. Category-Aware Prompts
The user's category (selected in profile/onboarding) changes how AI generates images.

| Category | Photo Shoot prompt | Catalogue prompt (how model interacts) |
|---|---|---|
| Jewelry | Product on velvet/marble/satin surface, dramatic lighting | Model wearing the jewelry (necklace on neck, earrings on ears, ring on finger, bracelet on wrist) |
| Fashion & Clothing | Product laid flat or on mannequin, styled background | Model wearing the outfit, full body shot, natural drape |
| Accessories | Product on styled surface, lifestyle setting | Model holding/carrying bag, wearing watch/glasses/belt |
| Kids | Product on soft/playful background | Child model wearing/playing with the product |
| Home & Living | Product in a styled room setting | Model using/interacting with furniture/decor in a room |
| Art & Craft | Product on desk/workspace, creative setting | Model using art supplies, crafting |
| Beauty & Wellness | Product on marble/clean surface, spa aesthetic | Model applying/using the beauty product |
| Electronics | Product on desk/modern surface, tech aesthetic | Model using the gadget naturally |
| Food & Beverages | Dish on table, styled plating, restaurant setting | Model at a dining table with the food |

### 6. Profile Page
- **Name** → Name, Business Name
- **Category Selection** → Change category
- **Daily Rewards** → Get Free Image Creations
- **Settings** → Support, Refund & Privacy Policy

Profile details form:
- Business Logo (upload)
- Name *
- Business Name *
- Apply Branding (toggle)
- Mobile Number (read-only, shows login number)
- Business Address
- Business Website URL
- Email Address
- Save button

### 7. Payments & Credits
- Trial plan: ₹1 for 7 images
- Premium: ₹299/month after trial
- "X images left" shown on Projects page
- When credits expire: images locked with overlay
- Payment bottom sheet appears when:
  - User tries to create with 0 credits
  - User taps "Buy More" on Projects page
- Trial benefits shown:
  - Start Free Trial with ₹1
  - Create Studio Quality Photos in Seconds
  - Create 7 images in free trial
  - Use 100+ Premium Models
  - Premium at ₹299/Month after 1 day

### 8. Bottom Navigation
Three tabs:
- 🏠 **Home** — feed with examples
- 📷 **Create** — center button (opens Select One sheet)
- 📁 **Projects** — user's generated images

---

## ORIGINAL SORAPIXEL FEATURES (PARKED — may add later)

These features existed in the original SoraPixel app but Flyr does not have them.
We will NOT build these now, but may add them on top later.

### Jewelry-Specific
- **Metal Recolor** — Change jewelry metal (gold → silver → rose gold) while preserving stones
- **HD Upscale** — Upscale generated image to high resolution using fal.ai Flux Dev img2img
- **AI Listing Generator** — Generate Shopify-ready product listing (title, description, meta, alt text) following Stylika brand guidelines
- **Virtual Try-On** — Place jewelry on a person's photo (necklace on neck, earring on ear, etc.)

### Studio-Specific
- **Style Presets** — Named styles: Clean White, Lifestyle, Luxury, Nature, Minimal, Festive
- **3-Image Pack Generation** — Generate Hero Shot + Alternate Angle + Close-up Detail in one go
- **AI Prompt Refinement** — User types rough idea, AI refines it into professional photography prompt
- **Product Info Extraction** — AI analyzes product image and generates title + description

### Admin
- **Client Management** — View all clients, toggle active/inactive, manage allowed sections
- **Token Management** — Add tokens to any client
- **Stats Dashboard** — View generation counts, active users, revenue

---

## TECH NOTES

### Backend (FastAPI)
- All prompts are category-aware and centralized in `prompt_service.py`
- Backgrounds and poses have thumbnail URLs stored in DB or served as static assets
- Model face images stored in Supabase Storage or served as static assets
- Credits system: free tier (daily reward) + paid tier (₹1 trial, ₹299/month)

### Frontend (Next.js)
- Mobile-first responsive design
- All API calls go through `api-client.ts` → FastAPI backend
- JWT auth with token refresh
- Bottom sheet pattern for Create flow and Advanced Settings

### Database (Supabase)
- `clients` — user profiles, category, branding info, credits
- `categories` — 9 seeded categories with subcategories
- `projects` — user generations (photoshoot + catalogue)
- `payments` — Razorpay transactions
- `feed_items` — pre-generated examples for home feed
- `otps` — OTP storage for auth

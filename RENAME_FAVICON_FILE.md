# Manual Step Required: Rename Favicon File

## Action Required

You need to manually rename the favicon file to remove spaces:

**From:** `frontend/public/Final logo Figma 1.svg`  
**To:** `frontend/public/favicon.svg`

## How to Rename (Windows)

### Option 1: Using File Explorer
1. Navigate to `frontend/public/` folder
2. Find the file `Final logo Figma 1.svg`
3. Right-click → Rename
4. Change to `favicon.svg`

### Option 2: Using PowerShell (Run from project root)
```powershell
cd frontend\public
Rename-Item "Final logo Figma 1.svg" "favicon.svg"
```

### Option 3: Using Command Prompt
```cmd
cd frontend\public
ren "Final logo Figma 1.svg" favicon.svg
```

## Verification

After renaming, verify the file exists:
- Check that `frontend/public/favicon.svg` exists
- Check that `frontend/public/Final logo Figma 1.svg` no longer exists

## Note

All code references have already been updated to use `favicon.svg`, so once you rename the file, everything will work correctly.


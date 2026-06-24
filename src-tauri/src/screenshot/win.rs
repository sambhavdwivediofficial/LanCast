#[cfg(target_os = "windows")]
mod inner {
    use tauri::Window;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE,
    };

    pub fn protect(window: &Window) -> Result<(), String> {
        let hwnd = get_hwnd(window)?;
        unsafe {
            SetWindowDisplayAffinity(HWND(hwnd as *mut std::ffi::c_void), WDA_EXCLUDEFROMCAPTURE)
                .map_err(|e| format!("SetWindowDisplayAffinity failed: {e}"))?;
        }
        Ok(())
    }

    pub fn unprotect(window: &Window) -> Result<(), String> {
        let hwnd = get_hwnd(window)?;
        unsafe {
            SetWindowDisplayAffinity(HWND(hwnd as *mut std::ffi::c_void), WDA_NONE)
                .map_err(|e| format!("SetWindowDisplayAffinity failed: {e}"))?;
        }
        Ok(())
    }

    fn get_hwnd(window: &Window) -> Result<isize, String> {
        window
            .hwnd()
            .map(|h| h.0 as isize)
            .map_err(|e| format!("Failed to get HWND: {e}"))
    }
}

#[cfg(not(target_os = "windows"))]
mod inner {
    use tauri::Window;
    pub fn protect(_window: &Window) -> Result<(), String> { Ok(()) }
    pub fn unprotect(_window: &Window) -> Result<(), String> { Ok(()) }
}

pub use inner::{protect, unprotect};

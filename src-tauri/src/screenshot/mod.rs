pub mod linux;
pub mod mac;
pub mod win;

use tauri::Window;

pub struct ScreenshotGuard;

impl ScreenshotGuard {
    pub fn new() -> Self {
        Self
    }

    pub fn protect(&self, window: &Window) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        return win::protect(window);

        #[cfg(target_os = "macos")]
        return mac::protect(window);

        #[cfg(target_os = "linux")]
        return linux::protect(window);

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        Ok(())
    }

    pub fn unprotect(&self, window: &Window) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        return win::unprotect(window);

        #[cfg(target_os = "macos")]
        return mac::unprotect(window);

        #[cfg(target_os = "linux")]
        return linux::unprotect(window);

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        Ok(())
    }
}

impl Default for ScreenshotGuard {
    fn default() -> Self {
        Self::new()
    }
}

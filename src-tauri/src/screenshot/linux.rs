#[cfg(target_os = "linux")]
mod inner {
    use tauri::Window;

    pub fn protect(window: &Window) -> Result<(), String> {
        #[cfg(feature = "gtk")]
        {
            use gtk::prelude::*;
            use tauri::Manager;
            if let Ok(gtk_window) = window.gtk_window() {
                gtk_window.set_visual(gtk_window.screen().and_then(|s| s.rgba_visual()).as_ref());
            }
        }
        Ok(())
    }

    pub fn unprotect(_window: &Window) -> Result<(), String> { Ok(()) }
}

#[cfg(not(target_os = "linux"))]
mod inner {
    use tauri::Window;
    pub fn protect(_window: &Window) -> Result<(), String> { Ok(()) }
    pub fn unprotect(_window: &Window) -> Result<(), String> { Ok(()) }
}

pub use inner::{protect, unprotect};

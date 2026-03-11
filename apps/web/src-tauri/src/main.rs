// Prevents the Windows console window from opening on launch.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    vigilante_lib::run();
}

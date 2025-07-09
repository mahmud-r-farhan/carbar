import webview
import ctypes
import platform

def get_screen_size():
    if platform.system() == "Windows":
        user32 = ctypes.windll.user32
        user32.SetProcessDPIAware()
        screen_width = user32.GetSystemMetrics(0)
        screen_height = user32.GetSystemMetrics(1)
        return screen_width, screen_height
    else:
        return 1920, 1080

def main():
    debug = False
    window_title = "CarBar"
    window_url = "https://carbar-pi.vercel.app/"
    resizable = False

    screen_width, screen_height = get_screen_size()

    if screen_width <= 1366:
        width = 390
        height = 844
    else:
        width = 412
        height = 915

    left = int((screen_width - width) / 2)
    top = int((screen_height - height) / 2)

    webview.create_window(
        title=window_title,
        url=window_url,
        width=width,
        height=height,
        x=left,
        y=top,
        resizable=resizable,
        private_mode=True
    )

    webview.start(debug=debug)

if __name__ == "__main__":
    main()

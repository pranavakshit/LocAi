import webview
import sys

class Api:
    def open_file_dialog(self):
        window = webview.active_window()
        if not window:
            return None
        result = window.create_file_dialog(webview.OPEN_DIALOG)
        if result and len(result) > 0:
            return result[0]
        return None

    def open_folder_dialog(self):
        window = webview.active_window()
        if not window:
            return None
        result = window.create_file_dialog(webview.FOLDER_DIALOG)
        if result and len(result) > 0:
            return result[0]
        return None
        
    def open_url(self, url):
        import webbrowser
        webbrowser.open(url)

def main():
    api = Api()
    # Create a native desktop window that loads the React UI
    window = webview.create_window(
        title='LocAi Native Studio',
        url='http://localhost:8000/',
        js_api=api,
        width=1400,
        height=900,
        min_size=(800, 600)
    )
    
    # Start the native GUI loop
    webview.start()

if __name__ == '__main__':
    main()

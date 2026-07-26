import webview
import sys
import tkinter as tk
from tkinter import filedialog

class Api:
    def open_file_dialog(self):
        root = tk.Tk()
        root.attributes("-topmost", True)
        root.withdraw()
        file_path = filedialog.askopenfilename()
        return file_path or None

    def open_folder_dialog(self):
        root = tk.Tk()
        root.attributes("-topmost", True)
        root.withdraw()
        folder_path = filedialog.askdirectory()
        return folder_path or None
        
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

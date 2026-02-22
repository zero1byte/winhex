# WinHex File Analyzer

A lightweight, browser-based hex editor and file analyzer that lets you inspect any file in Hexadecimal, Binary, or Octal formats.

## Live Demo

[**Try WinHex Online**](https://yourusername.github.io/winhex)

## Features

- **Multiple View Modes** - Switch between Hexadecimal, Binary, and Octal representations
- **ASCII Preview** - See the ASCII character representation alongside byte data
- **File Information** - Displays file name, size, and MIME type
- **Pagination** - Navigate through large files with Previous/Next controls
- **Offset Column** - Track byte positions with hexadecimal offset addresses
- **Responsive Design** - Works on desktop and mobile devices
- **No Installation Required** - Runs entirely in your browser

## How to Use

1. Open the application in your browser
2. Click **"Choose File"** to select any file from your device
3. View the file contents in the default Hexadecimal format
4. Click **Hexadecimal**, **Binary**, or **Octal** buttons to switch view modes
5. Use **Previous** and **Next** buttons to navigate through larger files

## Table Layout

| Column | Description |
|--------|-------------|
| Offset | Hexadecimal address of the first byte in each row |
| Data | Byte values in the selected format (16 bytes per row) |
| ASCII | Printable ASCII characters (non-printable shown as `.`) |

## Technology Stack

- HTML5
- JavaScript (Vanilla)
- Tailwind CSS

## Local Development

Clone the repository and open `index.html` in your browser:

```bash
git clone https://github.com/yourusername/winhex.git
cd winhex
# Open index.html in your browser
```

No build tools or dependencies required.

## Browser Support

Works in all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## License

MIT License

---

Made with Tailwind CSS
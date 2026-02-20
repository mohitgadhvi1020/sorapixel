function b64toBlob(b64: string, mime = "image/png"): Blob {
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function shareToWhatsApp(base64: string, filename: string) {
  const blob = b64toBlob(base64);
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "SoraPixel Image" });
      return;
    } catch {
      /* user cancelled or share failed — fall through */
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setTimeout(() => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent("Check out this image I created with SoraPixel!")}`,
      "_blank",
    );
  }, 500);
}

export function downloadImage(base64: string, filename: string) {
  const blob = b64toBlob(base64);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

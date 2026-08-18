import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFExportOptions {
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  title?: string;
}

/**
 * Creates a helper canvas to convert modern CSS color formats (oklch, color-mix, lab, etc.)
 * into standard hex (#rrggbb) or rgb(r, g, b) that html2canvas supports.
 */
function createColorConverter(): (colorStr: string) => string {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    ctx = canvas.getContext('2d');
  } catch {
    // fallback if canvas context creation fails
  }

  return (colorStr: string): string => {
    if (!colorStr) return colorStr;
    const lower = colorStr.toLowerCase();
    if (!lower.includes('oklch') && !lower.includes('oklab') && !lower.includes('color-mix') && !lower.includes('lab(') && !lower.includes('lch(')) {
      return colorStr;
    }

    if (ctx) {
      try {
        ctx.fillStyle = '#000000';
        ctx.fillStyle = colorStr;
        const computed = ctx.fillStyle;
        if (computed && !computed.toLowerCase().includes('oklch') && !computed.toLowerCase().includes('oklab')) {
          return computed;
        }
      } catch {
        // ignore
      }
    }

    // Heuristic fallbacks for common shades if browser canvas doesn't serialize oklch to rgb
    if (lower.includes('0.9') || lower.includes('0.8')) return '#f1f5f9';
    if (lower.includes('0.7') || lower.includes('0.6')) return '#cbd5e1';
    if (lower.includes('0.5') || lower.includes('0.4')) return '#64748b';
    if (lower.includes('0.3') || lower.includes('0.2')) return '#334155';
    if (lower.includes('0.1') || lower.includes('0.0')) return '#0f172a';
    return '#1e293b';
  };
}

/**
 * Replaces all modern unsupported color functions inside a CSS text string
 */
function sanitizeCssText(css: string, converter: (color: string) => string): string {
  if (!css) return css;
  return css.replace(/(?:oklch|oklab|color-mix|lab|lch)\([^)]+\)/gi, (match) => converter(match));
}

/**
 * Generates and downloads a pixel-perfect A4 PDF from a DOM element
 * Uses a standardized 794px width A4 staging environment to eliminate
 * text warping, broken borders, and viewport responsiveness artifacts.
 */
export async function downloadElementAsPDF(
  element: HTMLElement,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    fileName = 'documento.pdf',
    orientation = 'portrait',
  } = options;

  const colorConverter = createColorConverter();

  // A4 dimensions in mm
  const a4WidthMm = orientation === 'portrait' ? 210 : 297;
  const a4HeightMm = orientation === 'portrait' ? 297 : 210;

  // Exact standard A4 pixel width at 96 DPI (210mm ≈ 793.7px)
  const standardA4WidthPx = 794;

  // Create an offscreen staging container with fixed A4 dimensions to ensure
  // that html2canvas renders identical typography, table widths, and borders
  // regardless of user screen resolution, browser zoom, or modal scrollbars.
  const stagingWrapper = document.createElement('div');
  stagingWrapper.style.position = 'fixed';
  stagingWrapper.style.left = '-99999px';
  stagingWrapper.style.top = '0';
  stagingWrapper.style.width = `${standardA4WidthPx}px`;
  stagingWrapper.style.backgroundColor = '#ffffff';
  stagingWrapper.style.color = '#000000';
  stagingWrapper.style.zIndex = '-9999';
  stagingWrapper.style.overflow = 'visible';
  stagingWrapper.style.boxSizing = 'border-box';

  const clonedNode = element.cloneNode(true) as HTMLElement;
  clonedNode.style.width = `${standardA4WidthPx}px`;
  clonedNode.style.minWidth = `${standardA4WidthPx}px`;
  clonedNode.style.maxWidth = `${standardA4WidthPx}px`;
  clonedNode.style.margin = '0 auto';
  clonedNode.style.boxShadow = 'none';
  clonedNode.style.backgroundColor = '#ffffff';
  clonedNode.style.boxSizing = 'border-box';
  clonedNode.style.fontFamily = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
  clonedNode.style.setProperty('-webkit-font-smoothing', 'antialiased');

  stagingWrapper.appendChild(clonedNode);
  document.body.appendChild(stagingWrapper);

  try {
    // Render canvas with high resolution scale
    const canvas = await html2canvas(clonedNode, {
      scale: 2.2, // 2.2x crisp DPI for ultra-sharp letters and 1px borders
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: standardA4WidthPx,
      windowWidth: standardA4WidthPx,
      onclone: (clonedDoc) => {
        // 1. Sanitize all <style> tags in the cloned document to remove any oklch color rules
        const styleTags = clonedDoc.querySelectorAll('style');
        styleTags.forEach((styleTag) => {
          if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab'))) {
            styleTag.textContent = sanitizeCssText(styleTag.textContent, colorConverter);
          }
        });

        // 2. Sanitize all elements with computed or inline oklch styles
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (!htmlEl || !htmlEl.style) return;

          // Check inline style attribute
          const styleAttr = htmlEl.getAttribute('style');
          if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
            htmlEl.setAttribute('style', sanitizeCssText(styleAttr, colorConverter));
          }

          // Check window computed styles for key color properties
          try {
            const computed = window.getComputedStyle(htmlEl);
            const colorProps: string[] = [
              'color',
              'backgroundColor',
              'borderColor',
              'borderTopColor',
              'borderBottomColor',
              'borderLeftColor',
              'borderRightColor',
              'outlineColor',
            ];

            colorProps.forEach((prop) => {
              const val = computed.getPropertyValue(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
              if (val && (val.includes('oklch') || val.includes('oklab'))) {
                const converted = colorConverter(val);
                htmlEl.style.setProperty(
                  prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
                  converted,
                  'important'
                );
              }
            });

            // Sanitize box shadow
            if (computed.boxShadow && (computed.boxShadow.includes('oklch') || computed.boxShadow.includes('oklab'))) {
              htmlEl.style.boxShadow = sanitizeCssText(computed.boxShadow, colorConverter);
            }
          } catch {
            // ignore if computed style is not accessible
          }
        });
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Calculate scaling to fit A4 page with 6mm margin
    const marginMm = 6;
    const targetWidthMm = a4WidthMm - marginMm * 2; // ~198mm
    const targetHeightMm = (canvas.height * targetWidthMm) / canvas.width;
    const maxSinglePageHeightMm = a4HeightMm - marginMm * 2; // ~285mm

    // If content fits within standard A4 single page height (or with minor 6% flex tolerance),
    // scale to fit 1 exact page without generating an accidental empty or truncated 2nd page.
    if (targetHeightMm <= maxSinglePageHeightMm * 1.06) {
      const finalHeightMm = Math.min(targetHeightMm, maxSinglePageHeightMm);
      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, targetWidthMm, finalHeightMm);
    } else {
      // Multi-page slicing if content genuinely exceeds single page (e.g. 15+ items)
      let heightLeft = targetHeightMm;
      let position = marginMm;

      pdf.addImage(imgData, 'JPEG', marginMm, position, targetWidthMm, targetHeightMm);
      heightLeft -= maxSinglePageHeightMm;

      while (heightLeft > 0) {
        position = heightLeft - targetHeightMm + marginMm;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', marginMm, position, targetWidthMm, targetHeightMm);
        heightLeft -= maxSinglePageHeightMm;
      }
    }

    // Sanitize file name
    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(safeFileName);
  } catch (error: any) {
    console.error('Error in downloadElementAsPDF:', error);
    // Trigger window print dialog fallback if canvas rendering fails
    window.print();
  } finally {
    // Clean up staging element from document
    if (stagingWrapper.parentNode) {
      stagingWrapper.parentNode.removeChild(stagingWrapper);
    }
  }
}

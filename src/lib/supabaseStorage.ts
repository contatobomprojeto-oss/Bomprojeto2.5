import { supabase } from './supabaseClient';

/**
 * Comprime uma imagem no lado do cliente antes de enviar ao Storage.
 * Reduz fotos de smartphone de 10MB+ para ~350KB-600KB em WebP/JPEG,
 * otimizando o consumo de banda e agilizando envios por WhatsApp.
 */
export async function compressImage(file: File, maxDimension = 1920, quality = 0.82): Promise<Blob> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
      return resolve(file);
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Converte um arquivo/Blob em Data URL (base64) para fallback imediato
 */
export function fileToDataUrl(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload de foto/anexo de projeto no Supabase Storage.
 * Se o bucket 'project-photos' não estiver criado ou houver restrição,
 * faz fallback elegante e transparente para Data URL sem interromper o usuário.
 */
export async function uploadProjectPhoto(
  projectId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; path: string; name: string }> {
  try {
    if (onProgress) onProgress(20);

    // 1. Otimizar imagem
    const compressedBlob = await compressImage(file);
    if (onProgress) onProgress(45);

    const cleanProject = projectId.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const timestamp = Date.now();
    const filePath = `projects/${cleanProject}/${timestamp}_${cleanName}`;

    if (onProgress) onProgress(65);

    // 2. Tentar upload no Supabase Storage
    try {
      const { data, error } = await supabase.storage
        .from('project-photos')
        .upload(filePath, compressedBlob, {
          contentType: compressedBlob.type || 'image/webp',
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('project-photos')
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          if (onProgress) onProgress(100);
          return {
            url: publicUrlData.publicUrl,
            path: data.path,
            name: file.name,
          };
        }
      }
    } catch (uploadErr) {
      console.warn('[Supabase Storage] Fallback para armazenamento de mídia em base64:', uploadErr);
    }

    // 3. Fallback transparente para Data URL
    const fallbackUrl = await fileToDataUrl(compressedBlob);
    if (onProgress) onProgress(100);

    return {
      url: fallbackUrl,
      path: filePath,
      name: file.name,
    };
  } catch (error: any) {
    console.warn('[Storage Error]:', error?.message || error);
    const dataUrl = await fileToDataUrl(file);
    return {
      url: dataUrl,
      path: `local/${file.name}`,
      name: file.name,
    };
  }
}

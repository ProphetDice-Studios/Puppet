import { buildSkinnedMesh, computeVertexWeights } from './mesh';
import {
  autoDetectJointsFromAlpha,
  detectEyesFromHeadAlpha,
  hasOpaqueBackground,
  removeSolidBackgroundFromBorders,
} from './rigging';
import { CharacterRigData, RestJoints } from './types';

export interface LoadedCharacterBundle {
  rig: CharacterRigData;
  textureCanvas: HTMLCanvasElement;
  rgba: Uint8ClampedArray;
  hadOpaqueBg: boolean;
}

export async function loadAndAutoRigPng(
  sourceUrl: string,
  name: string,
  options?: {
    autoRemoveOpaqueBg?: boolean;
    bgTolerance?: number;
  }
): Promise<LoadedCharacterBundle> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not decode PNG image. Please try another PNG file.'));
    el.src = sourceUrl;
  });

  const maxDim = 480;
  const rawW = Math.max(16, img.naturalWidth || img.width);
  const rawH = Math.max(16, img.naturalHeight || img.height);
  const scale = Math.min(1, (maxDim - 64) / Math.max(rawW, rawH));

  const drawW = Math.max(32, Math.round(rawW * scale));
  const drawH = Math.max(32, Math.round(rawH * scale));

  // Add breathing room around the character so mesh padding never clips at borders
  const pad = 32;
  const canvasW = drawW + pad * 2;
  const canvasH = drawH + pad * 2;

  // First inspect raw image corners before adding transparent padding
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = drawW;
  rawCanvas.height = drawH;
  const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
  if (!rawCtx) throw new Error('2D Canvas context unavailable');
  rawCtx.drawImage(img, 0, 0, drawW, drawH);

  const rawImageData = rawCtx.getImageData(0, 0, drawW, drawH);
  const hadOpaqueBg = hasOpaqueBackground(rawImageData.data, drawW, drawH);
  const shouldCutout = (options?.autoRemoveOpaqueBg ?? true) && hadOpaqueBg;

  if (shouldCutout) {
    const cleaned = removeSolidBackgroundFromBorders(
      rawImageData.data,
      drawW,
      drawH,
      options?.bgTolerance ?? 42
    );
    rawImageData.data.set(cleaned);
    rawCtx.putImageData(rawImageData, 0, 0);
  }

  // Blit into padded working texture canvas
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = canvasW;
  textureCanvas.height = canvasH;
  const texCtx = textureCanvas.getContext('2d', { willReadFrequently: true });
  if (!texCtx) throw new Error('2D Canvas context unavailable');
  texCtx.clearRect(0, 0, canvasW, canvasH);
  texCtx.drawImage(rawCanvas, pad, pad);

  const paddedData = texCtx.getImageData(0, 0, canvasW, canvasH);
  const rgba = paddedData.data;

  const restJoints = autoDetectJointsFromAlpha(rgba, canvasW, canvasH);
  const mesh = buildSkinnedMesh(rgba, canvasW, canvasH, restJoints, 18, 22);
  const eyes = detectEyesFromHeadAlpha(rgba, canvasW, canvasH, restJoints);

  const rig: CharacterRigData = {
    id: `char_${Date.now()}`,
    name,
    imageUrl: textureCanvas.toDataURL('image/png'),
    width: canvasW,
    height: canvasH,
    restJoints,
    mesh,
    removeBgApplied: shouldCutout,
    eyes,
  };

  return {
    rig,
    textureCanvas,
    rgba,
    hadOpaqueBg,
  };
}

export function rebindRigWithUpdatedJoints(
  bundle: LoadedCharacterBundle,
  updatedJoints: RestJoints
): LoadedCharacterBundle {
  const newWeights = computeVertexWeights(
    bundle.rgba,
    bundle.rig.width,
    bundle.rig.height,
    bundle.rig.mesh.restVertices,
    updatedJoints,
    bundle.rig.mesh.indices
  );
  const updatedEyes = detectEyesFromHeadAlpha(
    bundle.rgba,
    bundle.rig.width,
    bundle.rig.height,
    updatedJoints
  );

  return {
    ...bundle,
    rig: {
      ...bundle.rig,
      restJoints: updatedJoints,
      eyes: updatedEyes,
      mesh: {
        ...bundle.rig.mesh,
        weights: newWeights,
      },
    },
  };
}

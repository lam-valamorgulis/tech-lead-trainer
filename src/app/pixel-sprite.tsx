"use client";

import { useEffect, useRef } from "react";

/**
 * A small pixel-art picture, drawn from rows of letters. Each letter is a colour in `palette`,
 * and "." is empty. The picture grows by a whole number, with no smoothing (design 9).
 */
export function PixelSprite({ art, palette, scale }: { art: string[]; palette: Record<string, string>; scale: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const width = art[0].length;
  const height = art.length;

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    art.forEach((row, y) =>
      [...row].forEach((letter, x) => {
        if (letter === ".") return;
        context.fillStyle = palette[letter];
        context.fillRect(x, y, 1, 1);
      }),
    );
  }, [art, palette, width, height]);

  return (
    <canvas
      ref={canvas}
      className="pixel-art"
      width={width}
      height={height}
      style={{ width: width * scale, height: height * scale }}
      aria-hidden="true"
    />
  );
}

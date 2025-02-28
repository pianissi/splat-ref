'use client'
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { glMatrix } from "gl-matrix";
import { initBuffers } from "./init-buffers";
import { drawScene } from "./draw-scene";
import { initShaderProgram } from "./shaders";
import { setupModel } from "./model";
import { resizeCanvasToDisplaySize } from "@/lib/webgl-utils";
import { Moodboard } from "./moodboard";




export default function Home() {
  const [moodboard, setMoodboard] = useState<Moodboard | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  


  useLayoutEffect(() => {
    setMoodboard(new Moodboard());

  }, []);

  useEffect(() => {
    if (canvasRef.current === null)
      return;

    if (moodboard?.canvas === null) {
      
      moodboard?.setCanvas(canvasRef.current);
      moodboard?.setup();
      render();
    }
  }, [canvasRef, moodboard]);

  // const onImageLoad = () => {
  //   const canvas = canvasRef.current;
  //   if (canvas == null)
  //     return;
    
  //   });
  // }

  // useEffect(() => {
    



  //   // Render
  //   console.log("test1");
  //   // drawScene(gl, programInfo, buffers);
  //   requestAnimationFrame(render);
  // }, [shaderProgram]);

  const render = () => {
    moodboard?.render();

    requestAnimationFrame(render);
  };


  return (
    <canvas ref={canvasRef}
      style={{
          width: "100%",
          height: "100%",
      }}>
    </canvas>
  );
}

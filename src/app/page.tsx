'use client'
import { DragEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  
      moodboard?.setup(canvasRef.current);

      // load image
      const image = new Image();

      console.log("imaging");

      image.src = "http://localhost:3000/f-texture.png"
      image.addEventListener('load', function() {
        // Now that the image has loaded make copy it to the texture.
        moodboard.onImageLoad(image);
      });
      renderFrame();
    }
  }, [canvasRef, moodboard]);


  const renderFrame = () => {
    moodboard?.process();

    requestAnimationFrame(renderFrame);
  };

  

  // useEffect(() => {
  const onDragOver = (e: DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
  }

  const onDragEnter = (e: DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }


  const onFileDrop = (e: DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    

    console.log("onFileDrop");
    if (e.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      [...e.dataTransfer.items].forEach((item, i) => {
        // If dropped items aren't files, reject them
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file === null)
            return;
          if (file.type === "image/png" || file.type === "image/jpeg")
            handleImage(file);
          console.log(`… file[${i}].name = ${file.type}`);
        }
      });
    } else {
      // Use DataTransfer interface to access the file(s)
      [...e.dataTransfer.files].forEach((file, i) => {
        if (file.type === "image/png" || file.type === "image/jpeg")
          handleImage(file);
        console.log(`… file[${i}].name = ${file.type}`);
      });
    }
  }

  const handleImage = (file: File) => {
    console.log("imagehandling")
    if (canvasRef.current === null)
      return;

    if (moodboard !== null) {

      const fReader = new FileReader();
      // load image
      

      // fReader.readAsDataURL(file);

      console.log("imagehandling2")

      

      // fReader.addEventListener('load', function() {
      //   if (fReader.result === null || fReader.result === undefined)
      //     return;
      //   if (fReader.result instanceof ArrayBuffer)
      //     return;

      //   const image = new Image();
      //   image.addEventListener('load', function() {
      //     console.log("callback")
      //     // Now that the image has loaded make copy it to the texture.
      //     moodboard.onImageLoad(image);
      //   });
      //   image.src = fReader.result;
      //   console.log("wild")
      //   // Now that the image has loaded make copy it to the texture.
        
      //   // moodboard.onImageLoad(image);
      //   renderFrame();
      // });
      const image = new Image();
      image.addEventListener('load', function() {
        console.log("callback")
        // Now that the image has loaded make copy it to the texture.
        moodboard.onImageLoad(image);
      });
      image.src = URL.createObjectURL(file);
      console.log("wild")
      // Now that the image has loaded make copy it to the texture.
      
      // moodboard.onImageLoad(image);
      renderFrame();
    }
  };

  return (
    <canvas ref={canvasRef}
      style={{
          width: "100%",
          height: "100%",
          overflow: "hidden"
      }}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDrop={onFileDrop}>
    </canvas>
  );
}
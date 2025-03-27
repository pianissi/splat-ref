'use client'
import { DragEvent, RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Moodboard, UNSELECTED } from "./moodboard";
import Link from "next/link";
import { FiArrowLeft, FiDownload, FiSave, FiX } from "react-icons/fi";
import { RoundContainer } from "../../components/RoundContainer";
import { getMoodboard, initDb, MoodboardObject, updateMoodboard } from "@/api/moodboard";
import { useParams} from "next/navigation";
import { isBrowser } from "react-device-detect";
import { LuImageMinus, LuImagePlus } from "react-icons/lu";
import { Dialog } from "radix-ui";
import { MdOutlineDriveFileRenameOutline } from "react-icons/md";
import { RiCrosshair2Line } from "react-icons/ri";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useRouter } from "next/navigation";



export default function MoodboardPage({
  moodboard,
  saveMoodboardToDb,
  initMoodboard,
} : {
  moodboard : Moodboard,
  saveMoodboardToDb : () => Promise<void>,
  initMoodboard : (canvas: HTMLCanvasElement) => Promise<void>,
}) {

  const [selectedImageId, setSelectedImageId] = useState<number>(UNSELECTED);
  const [name, setName] = useState<string>("w");

  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // setImageFile(e.target.files[0]);
      const imageFile = e.target.files[0];
      if (!imageFile) {
        return;
      }
      if (imageFile.type === "image/png" || imageFile.type === "image/jpeg")
        handleImage(imageFile);
    }
  };

  const renderFrame = useCallback(() => {
    moodboard?.process();

    const id = moodboard?.getSelectedImageId();
    if (id !== undefined)
      setSelectedImageId(id);

    requestAnimationFrame(renderFrame);
  }, [moodboard]);

  useEffect(() => {
    const init = async () => {
      if (canvasRef.current === null)
        return;

      if (moodboard?.canvas === null) {
        await initMoodboard(canvasRef.current);
        setName(moodboard.moodboardData.moodboardName);
        renderFrame();
      } else {
        moodboard?.remount();
      }

    }
    init();
      
    return () => {
      console.log("i'm unmounting")
      if (!moodboard)
        return;
      saveMoodboardToDb();

      moodboard.unmount();
    }
  }, [canvasRef, initMoodboard, moodboard, renderFrame, saveMoodboardToDb]);

  useEffect(() => {
    const onBeforeUnload = async (event: BeforeUnloadEvent) => {
      event.preventDefault();
      
      
      if (!moodboard) {
        return;
      }
      
      // await saveMoodboardToDb();

      moodboard.unmount();
      return (event.returnValue = '');
    }
    
    window.addEventListener('beforeunload', onBeforeUnload, {capture: true});

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload, {capture: true});
    };
  }, [moodboard]);

  // useEffect(() => {
  const onDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
  }

  const onDragEnter = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }


  const onFileDrop = (e: DragEvent<HTMLElement>) => {
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

          if (file.type === "application/json") 
            handleJson(file);
          console.log(`… file[${i}].name = ${file.type}`);
        }
      });
    } else {
      // Use DataTransfer interface to access the file(s)
      [...e.dataTransfer.files].forEach((file, i) => {
        if (file.type === "image/png" || file.type === "image/jpeg")
          handleImage(file);
        if (file.type === "application/json")
          handleJson(file);
        console.log(`… file[${i}].name = ${file.type}`);
      });
    }
  }

  const handleImage = (file: File) => {
    console.log("imagehandling")
    if (canvasRef.current === null)
      return;

    if (moodboard !== null) {
      // load image
      console.log("imagehandling2")

      const image = new Image();
      image.addEventListener('load', function() {
        console.log("callback")
        // Now that the image has loaded make copy it to the texture.
        moodboard.onImageLoad(image);
      });
      image.src = URL.createObjectURL(file);
      // renderFrame();
    }
  };

  const handleJson = (file: File) => {
    console.log("jsonhandling")

    if (moodboard !== null) {
      const reader = new FileReader();
      reader.onloadend = function() {
        if (typeof this.result !== "string")
          return;
        // Now that the image has loaded make copy it to the texture.
        console.log("jsoned!");
        moodboard.fromJSON(JSON.parse(this.result));
      };

      reader.readAsText(file);
      // renderFrame();
    }
  };

  return (
    <div className="touch-none">
      <div
        style={{
          display: "flex",
          flex: "0 0 0",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "absolute",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          zIndex: "2",
          userSelect: "none",
        }}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDrop={onFileDrop}
        
      >
        <div className="flex flex-row">
          <RoundContainer hoverable={true}>
            <button onClick={async () => {
              await saveMoodboardToDb();
              router.back();

            }} className="block">
              <div className="block h-max overflow-hidden">
                <FiArrowLeft className="m-2" color="#666666" size="1.5em"></FiArrowLeft>
              </div>
            </button>
          </RoundContainer>
          {isBrowser && <RoundContainer className="mx-2 ml-0">
              <div className="m-2 mx-4 text-gray-500 max-w-sm text-ellipsis overflow-hidden text-nowrap" suppressHydrationWarning>
                {name}
              </div>
            </RoundContainer>}
        </div>
        <div onPointerDown={(event) => {
          event.stopPropagation();
          event.nativeEvent.stopImmediatePropagation();
          console.log("stopping propogations");
        }}>
          <LayoutGroup>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} layout transition={{default: {ease: "easeIn"}, layout: { duration: 0.2 }}}>
              <RoundContainer className="flex flex-row mx-0">
                {/* {isBrowser && <RoundContainer className="m-2">
                  <div className="m-2 mx-4 text-gray-500" suppressHydrationWarning>
                    Drag and drop images to make your moodboard!
                  </div>
                </RoundContainer>} */}
                <RoundContainer hoverable={true} className="m-2">
                  <input type="file" id="imageFile" className="absolute opacity-0 w-0 h-0" accept="image/png image/jpeg" onChange={handleImageFileChange}/>
                  <label htmlFor="imageFile" className="block overflow-hidden cursor-pointer">
                    <LuImagePlus className="m-2" color="#666666" size="1.5em"></LuImagePlus>
                  </label>
                </RoundContainer>
                <RoundContainer hoverable={true} className="m-2">
                  <button className="block" onClick={() => moodboard?.setCameraAttributes({x: 0, y: 0}, 1)}>
                    <RiCrosshair2Line className="m-2" color="#666666" size="1.5em"></RiCrosshair2Line>
                  </button>
                </RoundContainer>
                <AnimatePresence mode={"popLayout"}>
                  {selectedImageId !== UNSELECTED && <motion.div 
                    exit={{ scale: 0 }} 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{default: { duration: 0.2 }}}
                    className="flex flex-row"
                    layout
                  >
                    <div className="w-1 rounded-md m-2 bg-gray-300"/>
                    <RoundContainer hoverable={true } className="m-2">
                      <button className="block" onClick={() =>  {
                        moodboard?.deleteImage(selectedImageId)
                      }}>
                        <LuImageMinus className="m-2" color="#666666" size="1.5em"></LuImageMinus>
                      </button>
                    </RoundContainer>
                  </motion.div>}
                </AnimatePresence>
              
              </RoundContainer>
            </motion.div>
          </LayoutGroup>
            
        </div>
        <div className="flex flex-row items-start">
          {isBrowser && <RoundContainer className="opacity-0">
            <div className="m-2 mx-4 text-gray-500 max-w-sm text-ellipsis overflow-hidden text-nowrap" suppressHydrationWarning>
              {name}
            </div>
          </RoundContainer>}
          <div className="">
            <RoundContainer hoverable={true}>
              <button className="block" onClick={() => saveMoodboardToDb()}>
                <FiSave className="m-2" color="#666666" size="1.5em"></FiSave>
              </button>
            </RoundContainer>
            <RoundContainer hoverable={true}>
              <button className="block" onClick={() => moodboard?.saveMoodboard()}>
                <FiDownload className="m-2" color="#666666" size="1.5em"></FiDownload>
              </button>
            </RoundContainer>
            <RenameDialog handleSubmit={(newName) => {
                moodboard?.renameMoodboard(newName);
                saveMoodboardToDb();
              }}
              handleCancel={() => {
                if (moodboard?.moodboardData.moodboardName)
                  setName(moodboard?.moodboardData.moodboardName);
              }}
              value={name}
              setValue={setName}
            />
          </div>
        </div>
      </div>
      <canvas ref={canvasRef}
        style={{
            position: "absolute",
            top: "0",
            right: "0",
            height: "100vh",
            width: "100vw",
            overflow: "hidden"
        }}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDrop={onFileDrop}>
      </canvas>
    </div>
    
  );
}

function RenameDialog({handleSubmit, handleCancel, value, setValue}: Props) {
  const [open, setOpen] = useState<boolean>(false);
  
  const handleSave = () => {
    if (value) {
      console.log('Renaming');
      if (handleSubmit)
        handleSubmit(value)
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      handleCancel();
    }
  }, [handleCancel, open])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="block bg-white justify-center align-middle m-4 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500">
          <MdOutlineDriveFileRenameOutline className="m-2" color="#666666" size="1.5em"></MdOutlineDriveFileRenameOutline>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[#000000a9] z-10"/>
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-5 rounded-lg z-10">
          <Dialog.Title className="text-xl font-bold text-gray-700">Rename moodboard</Dialog.Title>
          <fieldset className="py-2 flex">
            <label htmlFor="name" className="pr-2 py-2 text-gray-500">
              Name
            </label>
            <input id="name" value={value} onChange={e => setValue(e.target.value)} className="unset p-2 rounded-md flex outline-gray-400 text-gray-500 outline-dashed outline-1 focus:outline focus:outline-2 focus:gray-600"/>
          </fieldset>
          <div className="flex justify-end">
            <button onClick={handleSave} className="block text-gray-500 bg-white justify-center align-middle m-2 p-2 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500">
              Save
            </button>
          </div>
           <Dialog.Close asChild>
             <button onClick={handleCancel} className="block absolute top-2 right-2">
               <FiX className="m-2" color="#666666" size="1.2em"></FiX>
             </button>
           </Dialog.Close>
         </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface Props {
  handleSubmit: (arg0: string) => void,
  handleCancel: () => void,
  value: string,
  setValue: (arg0: string) => void,
}
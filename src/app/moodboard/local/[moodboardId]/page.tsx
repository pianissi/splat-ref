'use client'
import { useCallback, useState } from "react";
import { getMoodboard, initDb, updateMoodboard } from "@/api/moodboard";
import { useParams} from "next/navigation";
import MoodboardPage from "../../moodboardPage";
import { Moodboard } from "../../moodboard";



export default function LocalMoodboardPage() {
  const params = useParams<{moodboardId: string}>();
  const [moodboard] = useState<Moodboard>(new Moodboard({"moodboardId": Number(params.moodboardId), "ownerId": -1, "moodboardName": "", "thumbnail": null}));


  const saveMoodboardToDb = useCallback(async () => {
    if (!moodboard)
      return;

    const moodboardObj = await moodboard.toDBFormat();
    updateMoodboard(moodboardObj);
  }, [moodboard]);

  const initMoodboard = async (canvas: HTMLCanvasElement) => {
    moodboard?.setup(canvas);
    const init = async () => {
      await initDb();
      const savedMoodboard = await getMoodboard(Number(params.moodboardId));
      if (!savedMoodboard)
        return;
      
      // setName(savedMoodboard.moodboardName);
      console.log(savedMoodboard.moodboardName);
      if (!savedMoodboard.moodboardData) {
        moodboard?.setMoodboardMetadata({"moodboardId": Number(params.moodboardId), "ownerId": -1, "moodboardName": savedMoodboard.moodboardName, "thumbnail": null});
        return;
      }
      await moodboard?.fromJSON(JSON.parse(savedMoodboard.moodboardData));
    }
    await init();
  }

  return (
    <MoodboardPage
      moodboard={moodboard}
      saveMoodboardToDb={saveMoodboardToDb}
      initMoodboard={initMoodboard}
    />
  );
}
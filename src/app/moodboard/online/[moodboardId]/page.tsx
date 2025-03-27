'use client'
import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getMoodboard, initDb, updateMoodboard } from "@/api/moodboard";
import { useParams} from "next/navigation";
import MoodboardPage from "../../moodboardPage";
import { Moodboard } from "../../moodboard";



export default function OnlineMoodboardPage() {
  const params = useParams<{moodboardId: string}>();
  const [moodboard] = useState<Moodboard>(new Moodboard({"moodboardId": Number(params.moodboardId), "ownerId": -1, "moodboardName": "", "thumbnail": null}));
  const [, setAccessToken] = useState<string>("");

  const refreshAccessToken = useCallback(async () => {
    console.log("test");
      // first init token
    const refreshResponse = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/auth/refresh",{
      method: "POST",
      credentials: "include",
    });

    const refreshJson = await refreshResponse.json();
    
    const tempAccessToken = refreshJson.accessToken;
    
    setAccessToken(tempAccessToken);

    return tempAccessToken;
  }, []);

  const saveMoodboardToDb = useCallback(async () => {
    if (!moodboard)
      return;

    const moodboardObj = await moodboard.toDBFormat();
    const tempAccessToken = await refreshAccessToken();

    const formData = new FormData();

    formData.set("moodboardDto", JSON.stringify({
      moodboardId: params.moodboardId,
      name: moodboardObj.moodboardName,
      thumbnail: moodboardObj.thumbnail,
      data: moodboardObj.moodboardData,
      ownerId: moodboardObj.ownerId
    }))

    await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/moodboard/update-moodboard/" + params.moodboardId,{
      method: "PUT",
      credentials: "include",
      body: formData,
      headers: new Headers({
        "Authorization": "Bearer " + tempAccessToken,
      }),
    });
  }, [moodboard, params.moodboardId, refreshAccessToken]);

  const initMoodboard = async (canvas: HTMLCanvasElement) => {
    moodboard?.setup(canvas);
    const init = async () => {
      const tempAccessToken = await refreshAccessToken();
      const getMoodboardResponse = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/moodboard/" + params.moodboardId,{
        method: "GET",
        credentials: "include",
        headers: new Headers({
          "Authorization": "Bearer " + tempAccessToken,
        }),
      });

      const savedMoodboard = await getMoodboardResponse.json();

      console.log(savedMoodboard);
      console.log("getting response");
      if (!savedMoodboard)
        return;
      
      // setName(savedMoodboard.moodboardName);
      console.log(savedMoodboard.name);
      if (!savedMoodboard.data) {
        moodboard?.setMoodboardMetadata({"moodboardId": Number(params.moodboardId), "ownerId": savedMoodboard.ownerId, "moodboardName": savedMoodboard.name, "thumbnail": savedMoodboard.thumbnail});
        return;
      }
      console.log(JSON.parse(savedMoodboard.data));
      await moodboard?.fromJSON(JSON.parse(savedMoodboard.data));
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
'use client'
import { RoundContainer } from "@/components/RoundContainer";
import Link from "next/link";
import { useState } from "react";
import { FiPlus } from "react-icons/fi";

const mockData = [{"moodboardId": 1}, {"moodboardId": 2}];

interface MoodboardId {
  moodboardId: number
}

export default function Home() {
  const [moodboardIds, setMoodboardIds] = useState<MoodboardId[]>([{moodboardId: 1}, {moodboardId: 2}]);

  const moodboards = [];
  for (const moodboardId of moodboardIds) {
    moodboards.push(<MoodboardLink key={moodboardId.moodboardId}/>);
  }

  const addMoodboard = () => {
    setMoodboardIds(
      [
        ...moodboardIds,
        {moodboardId: moodboardIds.slice(-1)[0].moodboardId + 1}
      ]
    )
  };

  return (
    <div className="flex flex-col p-4 justify-between h-screen w-screen">
      <div className="flex p-4">
        {moodboards}
      </div>
      <div className="flex flex-row-reverse">
        <RoundContainer hoverable={true}>
          <button className="block" onClick={addMoodboard}>
            <FiPlus className="m-2" size="1.5em"></FiPlus>
          </button>
        </RoundContainer>
      </div>
    </div>
  );
}

function MoodboardLink() {
  return <Link className="m-2 h-fit flex shrink-0 p-6 bg-white hover:bg-slate-200 rounded-xl shadow-lg justify-center " href="/moodboard/1">To moodboard</Link>;
}
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

interface MatchInfo {
  category: string
  gender: string
  courtNumber: string
  mainReferee: string
  assistantReferee: string
  round: string
  startTimeHour: string
  startTimeMinute: string
  endTimeHour: string
  endTimeMinute: string
  year: string
  month: string
  day: string
  dayOfWeek: string
  gamesToWin: string
  lineJudge1: string
  lineJudge2: string
}

interface Team {
  id: string
  number: string
  affiliation: string
  playerA: string
  playerB: string
}

interface GameRow {
  leftServing: "S" | "R"
  rightServing: "S" | "R"
  points: {
    left: Array<"○" | "×" | null>
    right: Array<"○" | "×" | null>
  }
  score: {
    left: number
    right: number
  }
  gameNumber: number
  isFinal: boolean
  isGameSet: boolean
}

export default function Component() {
  const printRef = useRef<HTMLDivElement>(null)
  const [matchInfo, setMatchInfo] = useState<MatchInfo>({
    category: "",
    gender: "",
    courtNumber: "",
    mainReferee: "",
    assistantReferee: "",
    round: "",
    startTimeHour: "",
    startTimeMinute: "",
    endTimeHour: "",
    endTimeMinute: "",
    year: "",
    month: "",
    day: "",
    dayOfWeek: "",
    lineJudge1: "",
    lineJudge2: "",
    gamesToWin: "5"
  })

  const [teams, setTeams] = useState<{
    left: Team
    right: Team
  }>({
    left: {
      id: "1",
      number: "",
      affiliation: "",
      playerA: "",
      playerB: "",
    },
    right: {
      id: "2",
      number: "",
      affiliation: "",
      playerA: "",
      playerB: "",
    },
  })

  const [games, setGames] = useState<GameRow[]>([])
  const [totalScore, setTotalScore] = useState({ left: 0, right: 0 })
  const [servings, setServings] = useState<{ [key: number]: { left: "S" | "R", right: "S" | "R", initial: boolean } }>({});

  useEffect(() => {
    setGames(Array(9).fill(null).map((_, index) => ({
      leftServing: index % 2 === 0 ? "S" : "R",
      rightServing: index % 2 === 0 ? "R" : "S",
      points: {
        left: Array(42).fill(null),
        right: Array(42).fill(null),
      },
      score: {
        left: 0,
        right: 0,
      },
      gameNumber: index + 1,
      isFinal: index === 8,
      isGameSet: false
    })))
    setServings(prevServings => {
      const newServings = {};
      for (let i = 0; i < 9; i++) {
        newServings[i] = { left: i % 2 === 0 ? "S" : "R", right: i % 2 === 0 ? "R" : "S", initial: true };
      }
      return newServings;
    });
  }, [])

  useEffect(() => {
    const newTotalScore = games.reduce(
      (acc, game) => ({
        left: acc.left + (game.isGameSet && game.score.left > game.score.right ? 1 : 0),
        right: acc.right + (game.isGameSet && game.score.right > game.score.left ? 1 : 0),
      }),
      { left: 0, right: 0 }
    )
    setTotalScore(newTotalScore)
  }, [games])

  const handleServingChange = (gameIndex: number, side: "left" | "right", value: "S" | "R") => {
    setServings(prev => {
      const newServings = { ...prev };
      newServings[gameIndex] = {
        ...newServings[gameIndex],
        [side]: value,
        [side === "left" ? "right" : "left"]: value === "S" ? "R" : "S",
        initial: false
      };
      return newServings;
    });
  };

  const handlePointClick = (gameIndex: number, side: "left" | "right", pointIndex: number) => {
    setGames(prev => {
      const newGames = [...prev]
      const game = { ...newGames[gameIndex] }
      const currentValue = game.points[side][pointIndex]
      const newValue = currentValue === null ? "○" : currentValue === "○" ? "×" : null

      game.points[side] = [...game.points[side]]
      game.points[side][pointIndex] = newValue

      const oppositeSide = side === "left" ? "right" : "left"
      game.points[oppositeSide] = [...game.points[oppositeSide]]
      game.points[oppositeSide][pointIndex] = newValue === "○" ? "×" : newValue === "×" ? "○" : null

      game.score.left = game.points.left.filter(p => p === "○").length
      game.score.right = game.points.right.filter(p => p === "○").length

      // デュースルールの適用
      if (game.isFinal) {
        if (game.score.left >= 6 && game.score.right >= 6) {
          game.isGameSet = Math.abs(game.score.left - game.score.right) >= 2
        } else {
          game.isGameSet = game.score.left >= 7 || game.score.right >= 7
        }
      } else {
        if (game.score.left >= 3 && game.score.right >= 3) {
          game.isGameSet = Math.abs(game.score.left - game.score.right) >= 2
        } else {
          game.isGameSet = game.score.left >= 4 || game.score.right >= 4
        }
      }

      newGames[gameIndex] = game
      return newGames
    })
  }

  const generateTimeOptions = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const value = (start + i).toString().padStart(2, '0')
      return <SelectItem key={value} value={value}>{value}</SelectItem>
    })
  }

  const handlePrint = async () => {
    if (!printRef.current) return

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      width: printRef.current.scrollWidth,
      height: printRef.current.scrollHeight,
      windowWidth: printRef.current.scrollWidth,
      windowHeight: printRef.current.scrollHeight
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    pdf.addImage(imgData, 'PNG', 0, 0, 297, 210)
    pdf.save(`tennis-score-${timestamp}.pdf`)
  }

  const handleImageExport = async () => {
    if (!printRef.current) return

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      width: printRef.current.scrollWidth,
      height: printRef.current.scrollHeight,
      windowWidth: printRef.current.scrollWidth,
      windowHeight: printRef.current.scrollHeight
    })

    const imgData = canvas.toDataURL('image/png')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const link = document.createElement('a')
    link.href = imgData
    link.download = `tennis-score-${timestamp}.png`
    link.click()
  }

  return (
    <div className="w-[350mm] h-[210mm] mx-auto p-4 bg-white">
      <div className="flex justify-end mb-4">
        <Button onClick={handleImageExport} className="mr-2">画像出力</Button>
        <Button onClick={handlePrint}>PDF出力</Button>
      </div>
      <h1 className="text-2xl font-bold text-center mb-4">ソフトテニス採点表</h1>
      <div ref={printRef} className="bg-white p-2">
        <table className="w-full border-collapse border-2 border-black text-xs">
          <tbody>
            {/* Header Rows */}
            <tr>
              <td className="border border-black p-2 w-1/6">
                <div className="flex items-center gap-4">
                  <span className="whitespace-nowrap">種別</span>
                  <div className="flex items-center gap-4">
                    <div
                      className={`cursor-pointer flex items-center justify-center w-8 h-8 rounded-full ${matchInfo.gender === "男" ? "border-2 border-black bg-white" : ""}`}
                      onClick={() => setMatchInfo(prev => ({ ...prev, gender: "男" }))}
                    >
                      男
                    </div>
                    <span>・</span>
                    <div
                      className={`cursor-pointer flex items-center justify-center w-8 h-8 rounded-full ${matchInfo.gender === "女" ? "border-2 border-black bg-white" : ""}`}
                      onClick={() => setMatchInfo(prev => ({ ...prev, gender: "女" }))}
                    >
                      女
                    </div>
                  </div>
                </div>
              </td>
              <td className="border border-black p-2 w-1/6">
                <div className="flex items-center gap-2">
                  <span>第</span>
                  <Select
                    value={matchInfo.round}
                    onValueChange={(value) => setMatchInfo(prev => ({ ...prev, round: value }))}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 50 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>回戦</span>
                </div>
              </td>
              <td className="border border-black p-2 w-1/4">
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">正審</Label>
                  <Input
                    value={matchInfo.mainReferee}
                    onChange={(e) => setMatchInfo(prev => ({ ...prev, mainReferee: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </td>
              <td className="border border-black p-2 w-1/4">
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">副審</Label>
                  <Input
                    value={matchInfo.assistantReferee}
                    onChange={(e) => setMatchInfo(prev => ({ ...prev, assistantReferee: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 w-1/6">
                <div className="flex items-center gap-2">
                  <span>第</span>
                  <Select
                    value={matchInfo.courtNumber}
                    onValueChange={(value) => setMatchInfo(prev => ({ ...prev, courtNumber: value }))}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 30 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>コート</span>
                </div>
              </td>
              <td className="border border-black p-2" colSpan={2}>
                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-2">
                    <span>開始</span>
                    <div className="flex items-center">
                      <Select
                        value={matchInfo.startTimeHour}
                        onValueChange={(value) => setMatchInfo(prev => ({ ...prev, startTimeHour: value }))}
                      >
                        <SelectTrigger className="w-16">
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateTimeOptions(0, 23)}
                        </SelectContent>
                      </Select>
                      <span> : </span>
                      <Select
                        value={matchInfo.startTimeMinute}
                        onValueChange={(value) => setMatchInfo(prev => ({ ...prev, startTimeMinute: value }))}
                      >
                        <SelectTrigger className="w-16">
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateTimeOptions(0, 59)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>終了</span>
                    <div className="flex items-center">
                      <Select
                        value={matchInfo.endTimeHour}
                        onValueChange={(value) => setMatchInfo(prev => ({ ...prev, endTimeHour: value }))}
                      >
                        <SelectTrigger className="w-16">
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateTimeOptions(0, 23)}
                        </SelectContent>
                      </Select>
                      <span> : </span>
                      <Select
                        value={matchInfo.endTimeMinute}
                        onValueChange={(value) => setMatchInfo(prev => ({ ...prev, endTimeMinute: value }))}
                      >
                        <SelectTrigger className="w-16">
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateTimeOptions(0, 59)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>勝利ゲーム数</span>
                    <Select
                      value={matchInfo.gamesToWin}
                      onValueChange={(value) => setMatchInfo(prev => ({ ...prev, gamesToWin: value }))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="7">7</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </td>
              <td className="border border-black p-2" colSpan={2}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Label className="whitespace-nowrap">線審</Label>
                    <Input
                      value={matchInfo.lineJudge1}
                      onChange={(e) => setMatchInfo(prev => ({ ...prev, lineJudge1: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Label className="whitespace-nowrap">線審</Label>
                    <Input
                      value={matchInfo.lineJudge2}
                      onChange={(e) => setMatchInfo(prev => ({ ...prev, lineJudge2: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </td>
            </tr>

            {/* Team Information Row with Centered Total Score */}
            <tr>
              <td className="border-2 border-black p-2 w-1/4">
                {/* Left team info */}
                <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                  <div>
                    <Label htmlFor="leftTeamNumber">No.</Label>
                    <Select
                      value={teams.left.number}
                      onValueChange={(value) => setTeams(prev => ({
                        ...prev,
                        left: { ...prev.left, number: value }
                      }))}
                    >
                      <SelectTrigger id="leftTeamNumber" className="w-16">
                        <SelectValue placeholder="" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 100 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="leftTeamAffiliation">所属</Label>
                    <Input
                      id="leftTeamAffiliation"
                      value={teams.left.affiliation}
                      onChange={(e) => setTeams(prev => ({
                        ...prev,
                        left: { ...prev.left, affiliation: e.target.value }
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="leftTeamPlayerA">選手A</Label>
                  <Input
                    id="leftTeamPlayerA"
                    value={teams.left.playerA}
                    onChange={(e) => setTeams(prev => ({
                      ...prev,
                      left: { ...prev.left, playerA: e.target.value }
                    }))}
                    className="w-full"
                  />
                </div>
                <div className="mt-2">
                  <Label htmlFor="leftTeamPlayerB">選手B</Label>
                  <Input
                    id="leftTeamPlayerB"
                    value={teams.left.playerB}
                    onChange={(e) => setTeams(prev => ({
                      ...prev,
                      left: { ...prev.left, playerB: e.target.value }
                    }))}
                    className="w-full"
                  />
                </div>
              </td>
              <td colSpan={2} className="border-2 border-black p-2 w-1/2">
                <div className="flex justify-center items-center h-full">
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-xl mb-2">(スコア)</div>
                    <div className="text-6xl font-normal">
                      <span className={`inline-flex items-center justify-center ${totalScore.left >= parseInt(matchInfo.gamesToWin) ? 'rounded-full border-2 border-black w-16 h-16' : ''}`}>
                        {totalScore.left > 0 ? totalScore.left : (totalScore.right > 0 ? '0' : '')}
                      </span>
                      {" - "}
                      <span className={`inline-flex items-center justify-center ${totalScore.right >= parseInt(matchInfo.gamesToWin) ? 'rounded-full border-2 border-black w-16 h-16' : ''}`}>
                        {totalScore.right > 0 ? totalScore.right : (totalScore.left > 0 ? '0' : '')}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="border-2 border-black p-2 w-1/4">
                {/* Right team info */}
                <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                  <div>
                    <Label htmlFor="rightTeamNumber">No.</Label>
                    <Select
                      value={teams.right.number}
                      onValueChange={(value) => setTeams(prev => ({
                        ...prev,
                        right: { ...prev.right, number: value }
                      }))}
                    >
                      <SelectTrigger id="rightTeamNumber" className="w-16">
                        <SelectValue placeholder="" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 100 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rightTeamAffiliation">所属</Label>
                    <Input
                      id="rightTeamAffiliation"
                      value={teams.right.affiliation}
                      onChange={(e) => setTeams(prev => ({
                        ...prev,
                        right: { ...prev.right, affiliation: e.target.value }
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="rightTeamPlayerA">選手A</Label>
                  <Input
                    id="rightTeamPlayerA"
                    value={teams.right.playerA}
                    onChange={(e) => setTeams(prev => ({
                      ...prev,
                      right: { ...prev.right, playerA: e.target.value }
                    }))}
                    className="w-full"
                  />
                </div>
                <div className="mt-2">
                  <Label htmlFor="rightTeamPlayerB">選手B</Label>
                  <Input
                    id="rightTeamPlayerB"
                    value={teams.right.playerB}
                    onChange={(e) => setTeams(prev => ({
                      ...prev,
                      right: { ...prev.right, playerB: e.target.value }
                    }))}
                    className="w-full"
                  />
                </div>
              </td>
            </tr>

            {/* Game Rows */}
            {games.map((game, gameIndex) => (
              <tr key={gameIndex} className="border-2 border-black">
                <td colSpan={4} className="p-0">
                  <table className="w-full border-collapse">
                    <tbody>
                      {game.isFinal ? (
                        // Final game (3 rows, 14 columns)
                        [0, 1, 2].map((rowIndex) => (
                          <tr key={rowIndex}>
                            {rowIndex === 0 && (
                              <>
                                {/* 左 S/R */}
                                <td className="border border-black w-14" rowSpan={3}>
                                  <div className="flex items-center justify-center h-full gap-1">
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                                        !servings[gameIndex]?.initial && servings[gameIndex]?.left === "S" ? "border-2 border-black rounded-full bg-white" : ""
                                      }`}
                                      onClick={() => handleServingChange(gameIndex, "left", "S")}
                                    >
                                      <span className="text-sm">S</span>
                                    </div>
                                    <span>・</span>
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                                        !servings[gameIndex]?.initial && servings[gameIndex]?.left === "R" ? "border-2 border-black rounded-full bg-white" : ""
                                      }`}
                                      onClick={() => handleServingChange(gameIndex, "left", "R")}
                                    >
                                      <span className="text-sm">R</span>
                                    </div>
                                  </div>
                                </td>
                              </>
                            )}

                            {/* 左ポイント */}
                            {Array.from({ length: 14 }).map((_, pointIndex) => (
                              <td
                                key={pointIndex}
                                onClick={() => handlePointClick(gameIndex, "left", pointIndex + rowIndex * 14)}
                                className="border border-black w-8 h-14 text-center cursor-pointer hover:bg-gray-50 text-2xl relative"
                              >
                                {game.points.left[pointIndex + rowIndex * 14]}
                                {(Math.floor(pointIndex / 2) % 2 === 0) && (
                                  <span className="absolute top-0 right-0 text-[8px]">※</span>
                                )}
                              </td>
                            ))}

                            {rowIndex === 0 && (
                              <>
                                {/* スコア */}
                                <td className="border border-black w-20 text-center" rowSpan={3}>
                                  <div className="flex flex-col justify-center items-center h-full">
                                    <div className="text-xl mb-1">-F-</div>
                                    <div className="flex justify-center items-center space-x-2 text-2xl">
                                      <div className={`w-8 h-8 flex items-center justify-center ${game.isGameSet && game.score.left > game.score.right ? 'rounded-full border border-black' : ''}`}>
                                        {game.score.left > 0 ? game.score.left : (game.score.right > 0 ? '0' : '')}
                                      </div>
                                      <div>-</div>
                                      <div className={`w-8 h-8 flex items-center justify-center ${game.isGameSet && game.score.right > game.score.left ? 'rounded-full border border-black' : ''}`}>
                                        {game.score.right > 0 ? game.score.right : (game.score.left > 0 ? '0' : '')}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </>
                            )}

                            {/* 右ポイント */}
                            {Array.from({ length: 14 }).map((_, pointIndex) => (
                              <td
                                key={pointIndex}
                                onClick={() => handlePointClick(gameIndex, "right", pointIndex + rowIndex * 14)}
                                className="border border-black w-8 h-14 text-center cursor-pointer hover:bg-gray-50 text-2xl relative"
                              >
                                {game.points.right[pointIndex + rowIndex * 14]}
                                {(Math.floor(pointIndex / 2) % 2 === 1) && (
                                  <span className="absolute top-0 right-0 text-[8px]">※</span>
                                )}
                              </td>
                            ))}

                            {rowIndex === 0 && (
                              <>
                                {/* 右 S/R */}
                                <td className="border border-black w-14" rowSpan={3}>
                                  <div className="flex items-center justify-center h-full gap-1">
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                                        !servings[gameIndex]?.initial && servings[gameIndex]?.right === "S" ? "border-2 border-black rounded-full bg-white" : ""
                                      }`}
                                      onClick={() => handleServingChange(gameIndex, "right", "S")}
                                    >
                                      <span className="text-sm">S</span>
                                    </div>
                                    <span>・</span>
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                                        !servings[gameIndex]?.initial && servings[gameIndex]?.right === "R" ? "border-2 border-black rounded-full bg-white" : ""
                                      }`}
                                      onClick={() => handleServingChange(gameIndex, "right", "R")}
                                    >
                                      <span className="text-sm">R</span>
                                    </div>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      ) : (
                        // Regular games (2 rows, 14 columns)
                        [0, 1].map((rowIndex) => (
                          <tr key={rowIndex}>
                            {rowIndex === 0 && (
                              <>
                                {/* 左 S/R */}
                                <td className="border border-black w-14" rowSpan={2}>
                                  <div className="flex items-center justify-center h-full gap-1">
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                                        !servings[gameIndex]?.initial && servings[gameIndex]?.left === "S" ? "border-2 border-black rounded-full bg-white" : ""
                                      }`}
                                      onClick={() => handleServingChange(gameIndex, "left", "S")}
                                    >
                                      <span className="text-sm">S</span>
                                    </div>
                                    <span>・</span>
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                                        !servings[gameIndex]?.initial && servings[gameIndex]?.left === "R" ? "border-2 border-black rounded-full bg-white" : ""
                                      }`}
                                      onClick={() => handleServingChange(gameIndex, "left", "R")}
                                    >
                                      <span className="text-sm">R</span>
                                    </div>
                                  </div>
                                </td>
                              </>
                            )}

                            {/* 左ポイント */}
                            {Array.from({ length: 14 }).map((_, pointIndex) => (
                              <td
                                key={pointIndex}
                                onClick={() => handlePointClick(gameIndex, "left", pointIndex + rowIndex * 14)}
                                className="border border-black w-8 h-14 text-center cursor-pointer hover:bg-gray-50 text-2xl relative"
                              >
                                {game.points.left[pointIndex + rowIndex * 14]}
                              </td>
                            ))}

                            {rowIndex === 0 && (
                              <>
                                {/* スコア */}
                                <td className="border border-black w-20 text-center" rowSpan={2}>
                                  <div className="flex flex-col justify-between items-center h-full py-1">
                                    <div className="text-xl -mt-1">-{game.gameNumber}-</div>
                                    <div className="flex justify-center items-center space-x-2 text-2xl">
                                      <div className={`w-8 h-8 flex items-center justify-center ${game.isGameSet && game.score.left > game.score.right ? 'rounded-full border border-black' : ''}`}>
                                        {game.score.left > 0 ? game.score.left : (game.score.right > 0 ? '0' : '')}
                                      </div>
                                      <div>-</div>
                                      <div className={`w-8 h-8 flex items-center justify-center ${game.isGameSet && game.score.right > game.score.left ? 'rounded-full border border-black' : ''}`}>
                                        {game.score.right > 0 ? game.score.right : (game.score.left > 0 ? '0' : '')}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </>
                            )}

                            {/* 右ポイント */}
                            {Array.from({ length: 14 }).map((_, pointIndex) => (
                              <td
                                key={pointIndex}
                                onClick={() => handlePointClick(gameIndex, "right", pointIndex + rowIndex * 14)}
                                className="border border-black w-8 h-14 text-center cursor-pointer hover:bg-gray-50 text-2xl relative"
                              >
                                {game.points.right[pointIndex + rowIndex * 14]}
                              </td>
                            ))}

                            {rowIndex === 0 && (
                              <>
                                {/* 右 S/R */}
                                <td className="border border-black w-14" rowSpan={2}>
                                  <div className="flex items-center justify-center h-full gap-1">
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                                        !servings[gameIndex]?.initial && servings[gameIndex]?.right === "S" ? "border-2 border-black rounded-full bg-white" : ""
                                      }`}
                                      onClick={() => handleServingChange(gameIndex, "right", "S")}
                                    >
                                      <span className="text-sm">S</span>
                                    </div>
                                    <span>・</span>
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                                        !servings[gameIndex]?.initial && servings[gameIndex]?.right === "R" ? "border-2 border-black rounded-full bg-white" : ""
                                    }`}
                                    onClick={() => handleServingChange(gameIndex, "right", "R")}
                                  >
                                    <span className="text-sm">R</span>
                                  </div>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)
}
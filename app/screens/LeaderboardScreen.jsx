import React from "react";
import {
  Home,
  Trophy,
  Store,
  User,
  Flame,
  Gem,
} from "lucide-react";

export default function LeaderboardScreen() {
  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-[393px] bg-white p-4">

        {/* Header */}
        <div
          className="rounded-b-3xl p-5 text-white shadow-xl"
          style={{
            background:
              "linear-gradient(135deg,#5B00FF,#A100FF)",
          }}
        >
          <h1 className="text-3xl font-bold mb-4">
            Leaderboard
          </h1>

          <div className="grid grid-cols-3 gap-3">
            {["My State", "My City", "My School"].map(
              (item) => (
                <button
                  key={item}
                  className="bg-purple-700 border-4 border-purple-800 rounded-2xl py-3 font-bold text-xl"
                >
                  {item}
                </button>
              )
            )}
          </div>
        </div>

        {/* Podium */}
        <div className="flex justify-center items-end gap-4 mt-10">

          {/* 2nd */}
          <div className="w-28 bg-gray-300 rounded-3xl border-4 border-gray-200 p-3 text-center shadow">
            <div className="w-10 h-10 bg-white rounded-full mx-auto mb-2" />
            <h3 className="font-bold">Full Name</h3>
            <p className="text-sm">School</p>

            <div className="flex justify-center gap-1 mt-2">
              <Flame size={16} color="orange" />
              <span>20 Day Streak</span>
            </div>

            <div className="flex justify-center gap-1 mt-1">
              <Gem size={16} color="limegreen" />
              <span>2000 XP</span>
            </div>

            <div className="absolute" />
          </div>

          {/* 1st */}
          <div className="w-32 bg-yellow-300 rounded-3xl border-4 border-yellow-400 p-3 text-center shadow-lg">
            <div className="w-12 h-12 bg-white rounded-full mx-auto mb-2" />
            <h3 className="font-bold">Full Name</h3>
            <p>School</p>

            <div className="flex justify-center gap-1 mt-2">
              <Flame size={16} color="orange" />
              <span>30 Day Streak</span>
            </div>

            <div className="flex justify-center gap-1 mt-1">
              <Gem size={16} color="limegreen" />
              <span>3200 XP</span>
            </div>
          </div>

          {/* 3rd */}
          <div className="w-28 bg-orange-300 rounded-3xl border-4 border-orange-500 p-3 text-center shadow">
            <div className="w-10 h-10 bg-white rounded-full mx-auto mb-2" />
            <h3 className="font-bold">Full Name</h3>
            <p className="text-sm">School</p>

            <div className="flex justify-center gap-1 mt-2">
              <Flame size={16} color="orange" />
              <span>15 Day Streak</span>
            </div>

            <div className="flex justify-center gap-1 mt-1">
              <Gem size={16} color="limegreen" />
              <span>1000 XP</span>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="bg-white rounded-3xl shadow-lg p-4 mt-6 border">

          {[4, 5, 6, 7].map((rank) => (
            <div
              key={rank}
              className="flex items-center justify-between py-3 border-b"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-3xl">
                  {rank}
                </span>

                <div className="w-10 h-10 bg-black rounded-full" />

                <div>
                  <h4 className="font-bold">
                    Full Name
                  </h4>
                  <p className="text-sm">
                    School
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Flame
                  size={18}
                  color="orange"
                />
                <span>10 Days</span>

                <Gem
                  size={18}
                  color="limegreen"
                />
                <span>860 XP</span>

                <span className="font-bold">
                  380 pts
                </span>
              </div>
            </div>
          ))}

          {/* User */}
          <div
            className="rounded-2xl mt-4 p-3 flex justify-between items-center"
            style={{
              background:
                "linear-gradient(90deg,#A66BFF,#B38AFF)",
            }}
          >
            <div>
              <h3 className="text-red-700 font-bold text-2xl">
                #21 Alexandrina B.
              </h3>
              <p>Mount Prospect, IL</p>
            </div>

            <div className="text-5xl font-bold">
              60
              <span className="text-2xl">
                pts
              </span>
            </div>
          </div>

          <button className="w-full mt-4 text-purple-700 font-bold text-xl">
            View Full Leaderboard
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">

          <div className="bg-red-700 rounded-3xl p-4 text-white">
            <div className="flex items-center gap-3">
              <Flame
                size={60}
                color="#FFD34D"
              />
              <div>
                <div className="text-3xl font-bold">
                  8
                </div>
                <div>Day Streak</div>
                <div>x0.2</div>
              </div>
            </div>
          </div>

          <div className="bg-red-700 rounded-3xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-full border-8 border-green-400 flex items-center justify-center text-3xl font-bold">
                5
              </div>

              <div>
                <div>to beat</div>
                <div className="font-bold">
                  Amy D.
                </div>
                <div>(#20)</div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 w-[393px] bg-gray-100 border-t flex justify-around py-3">
          <Home />
          <Trophy color="#7B4DFF" />
          <Store />
          <User />
        </div>
      </div>
    </div>
  );
}
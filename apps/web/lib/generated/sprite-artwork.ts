import type { StaticImageData } from "next/image"

import artwork0 from "../../assets/sprites/8-bit.webp"
import artwork1 from "../../assets/sprites/adventure.webp"
import artwork2 from "../../assets/sprites/air.webp"
import artwork3 from "../../assets/sprites/aura.webp"
import artwork4 from "../../assets/sprites/batman.webp"
import artwork5 from "../../assets/sprites/birthday.png"
import artwork6 from "../../assets/sprites/blinky.webp"
import artwork7 from "../../assets/sprites/boss.webp"
import artwork8 from "../../assets/sprites/bounty-hunter-8-bit.png"
import artwork9 from "../../assets/sprites/bounty-hunter-adventure.png"
import artwork10 from "../../assets/sprites/bounty-hunter-birthday.png"
import artwork11 from "../../assets/sprites/bounty-hunter-blinky.png"
import artwork12 from "../../assets/sprites/bounty-hunter-body-slam.png"
import artwork13 from "../../assets/sprites/bounty-hunter-bush.png"
import artwork14 from "../../assets/sprites/bounty-hunter-crown.webp"
import artwork15 from "../../assets/sprites/bounty-hunter-jackrabbit.png"
import artwork16 from "../../assets/sprites/bounty-hunter-jonesy.png"
import artwork17 from "../../assets/sprites/bounty-hunter-killswitch.png"
import artwork18 from "../../assets/sprites/bounty-hunter-klombo.png"
import artwork19 from "../../assets/sprites/bounty-hunter-morgana.png"
import artwork20 from "../../assets/sprites/bounty-hunter-onigiri.png"
import artwork21 from "../../assets/sprites/bounty-hunter-overshield.png"
import artwork22 from "../../assets/sprites/bounty-hunter-pond.png"
import artwork23 from "../../assets/sprites/bounty-hunter-shadow.png"
import artwork24 from "../../assets/sprites/bounty-hunter-sonic.png"
import artwork25 from "../../assets/sprites/bounty-hunter-storm-scout.png"
import artwork26 from "../../assets/sprites/bounty-hunter-tails.png"
import artwork27 from "../../assets/sprites/bounty-hunter-x-ray.png"
import artwork28 from "../../assets/sprites/burnt-peanut.webp"
import artwork29 from "../../assets/sprites/bush.webp"
import artwork30 from "../../assets/sprites/cheat-master-8-bit.webp"
import artwork31 from "../../assets/sprites/cheat-master-adventure.webp"
import artwork32 from "../../assets/sprites/cheat-master-birthday.png"
import artwork33 from "../../assets/sprites/cheat-master-blinky.webp"
import artwork34 from "../../assets/sprites/cheat-master-bush.webp"
import artwork35 from "../../assets/sprites/cheat-master-crash-bandicoot.webp"
import artwork36 from "../../assets/sprites/cheat-master-crown.webp"
import artwork37 from "../../assets/sprites/cheat-master-jackrabbit.webp"
import artwork38 from "../../assets/sprites/cheat-master-jonesy.webp"
import artwork39 from "../../assets/sprites/cheat-master-killswitch.webp"
import artwork40 from "../../assets/sprites/cheat-master-klombo.webp"
import artwork41 from "../../assets/sprites/cheat-master-morgana.png"
import artwork42 from "../../assets/sprites/cheat-master-onigiri.webp"
import artwork43 from "../../assets/sprites/cheat-master-overshield.webp"
import artwork44 from "../../assets/sprites/cheat-master-pond.webp"
import artwork45 from "../../assets/sprites/cheat-master-shadow.webp"
import artwork46 from "../../assets/sprites/cheat-master-sonic.webp"
import artwork47 from "../../assets/sprites/cheat-master-storm-scout.webp"
import artwork48 from "../../assets/sprites/cheat-master-tails.webp"
import artwork49 from "../../assets/sprites/cheat-master-x-ray.webp"
import artwork50 from "../../assets/sprites/crash-bandicoot.webp"
import artwork51 from "../../assets/sprites/crown.webp"
import artwork52 from "../../assets/sprites/cube-batman.webp"
import artwork53 from "../../assets/sprites/cube-boss.webp"
import artwork54 from "../../assets/sprites/cube-dream.webp"
import artwork55 from "../../assets/sprites/cube-earth.webp"
import artwork56 from "../../assets/sprites/cube-fire.webp"
import artwork57 from "../../assets/sprites/cube-fishy.webp"
import artwork58 from "../../assets/sprites/cube-grim.webp"
import artwork59 from "../../assets/sprites/cube-punk.webp"
import artwork60 from "../../assets/sprites/cube-zero-point.webp"
import artwork61 from "../../assets/sprites/demon.webp"
import artwork62 from "../../assets/sprites/dream.webp"
import artwork63 from "../../assets/sprites/duck.webp"
import artwork64 from "../../assets/sprites/earth.webp"
import artwork65 from "../../assets/sprites/fire.webp"
import artwork66 from "../../assets/sprites/fishy.webp"
import artwork67 from "../../assets/sprites/galaxy-air.webp"
import artwork68 from "../../assets/sprites/galaxy-aura.webp"
import artwork69 from "../../assets/sprites/galaxy-batman.webp"
import artwork70 from "../../assets/sprites/galaxy-boss.webp"
import artwork71 from "../../assets/sprites/galaxy-demon.webp"
import artwork72 from "../../assets/sprites/galaxy-dream.webp"
import artwork73 from "../../assets/sprites/galaxy-duck.webp"
import artwork74 from "../../assets/sprites/galaxy-earth.webp"
import artwork75 from "../../assets/sprites/galaxy-fire.webp"
import artwork76 from "../../assets/sprites/galaxy-fishy.webp"
import artwork77 from "../../assets/sprites/galaxy-ghost.webp"
import artwork78 from "../../assets/sprites/galaxy-grim.webp"
import artwork79 from "../../assets/sprites/galaxy-king.webp"
import artwork80 from "../../assets/sprites/galaxy-llama.webp"
import artwork81 from "../../assets/sprites/galaxy-peely.webp"
import artwork82 from "../../assets/sprites/galaxy-punk.webp"
import artwork83 from "../../assets/sprites/galaxy-seven.webp"
import artwork84 from "../../assets/sprites/galaxy-striker.webp"
import artwork85 from "../../assets/sprites/galaxy-water.webp"
import artwork86 from "../../assets/sprites/galaxy-zero-point.webp"
import artwork87 from "../../assets/sprites/gem-aura.webp"
import artwork88 from "../../assets/sprites/gem-demon.webp"
import artwork89 from "../../assets/sprites/gem-duck.webp"
import artwork90 from "../../assets/sprites/gem-earth.webp"
import artwork91 from "../../assets/sprites/gem-grim.webp"
import artwork92 from "../../assets/sprites/gem-llama.webp"
import artwork93 from "../../assets/sprites/gem-water.webp"
import artwork94 from "../../assets/sprites/gem-zero-point.webp"
import artwork95 from "../../assets/sprites/ghost.webp"
import artwork96 from "../../assets/sprites/gold-8-bit.webp"
import artwork97 from "../../assets/sprites/gold-adventure.webp"
import artwork98 from "../../assets/sprites/gold-air.webp"
import artwork99 from "../../assets/sprites/gold-aura.webp"
import artwork100 from "../../assets/sprites/gold-batman.webp"
import artwork101 from "../../assets/sprites/gold-birthday.png"
import artwork102 from "../../assets/sprites/gold-blinky.webp"
import artwork103 from "../../assets/sprites/gold-boss.webp"
import artwork104 from "../../assets/sprites/gold-bush.webp"
import artwork105 from "../../assets/sprites/gold-crash-bandicoot.webp"
import artwork106 from "../../assets/sprites/gold-crown.webp"
import artwork107 from "../../assets/sprites/gold-demon.webp"
import artwork108 from "../../assets/sprites/gold-dream.webp"
import artwork109 from "../../assets/sprites/gold-duck.webp"
import artwork110 from "../../assets/sprites/gold-earth.webp"
import artwork111 from "../../assets/sprites/gold-fire.webp"
import artwork112 from "../../assets/sprites/gold-fishy.webp"
import artwork113 from "../../assets/sprites/gold-ghost.webp"
import artwork114 from "../../assets/sprites/gold-grim.webp"
import artwork115 from "../../assets/sprites/gold-jackrabbit.webp"
import artwork116 from "../../assets/sprites/gold-jonesy.webp"
import artwork117 from "../../assets/sprites/gold-killswitch.webp"
import artwork118 from "../../assets/sprites/gold-king.webp"
import artwork119 from "../../assets/sprites/gold-klombo.webp"
import artwork120 from "../../assets/sprites/gold-llama.webp"
import artwork121 from "../../assets/sprites/gold-morgana.png"
import artwork122 from "../../assets/sprites/gold-onigiri.webp"
import artwork123 from "../../assets/sprites/gold-overshield.webp"
import artwork124 from "../../assets/sprites/gold-peely.webp"
import artwork125 from "../../assets/sprites/gold-pond.webp"
import artwork126 from "../../assets/sprites/gold-punk.webp"
import artwork127 from "../../assets/sprites/gold-seven.webp"
import artwork128 from "../../assets/sprites/gold-shadow.webp"
import artwork129 from "../../assets/sprites/gold-sonic.webp"
import artwork130 from "../../assets/sprites/gold-storm-scout.webp"
import artwork131 from "../../assets/sprites/gold-striker.webp"
import artwork132 from "../../assets/sprites/gold-tails.webp"
import artwork133 from "../../assets/sprites/gold-water.webp"
import artwork134 from "../../assets/sprites/gold-x-ray.webp"
import artwork135 from "../../assets/sprites/gold-zero-point.webp"
import artwork136 from "../../assets/sprites/grim.webp"
import artwork137 from "../../assets/sprites/gummy-air.webp"
import artwork138 from "../../assets/sprites/gummy-aura.webp"
import artwork139 from "../../assets/sprites/gummy-batman.webp"
import artwork140 from "../../assets/sprites/gummy-boss.webp"
import artwork141 from "../../assets/sprites/gummy-demon.webp"
import artwork142 from "../../assets/sprites/gummy-dream.webp"
import artwork143 from "../../assets/sprites/gummy-duck.webp"
import artwork144 from "../../assets/sprites/gummy-earth.webp"
import artwork145 from "../../assets/sprites/gummy-fire.webp"
import artwork146 from "../../assets/sprites/gummy-fishy.webp"
import artwork147 from "../../assets/sprites/gummy-ghost.webp"
import artwork148 from "../../assets/sprites/gummy-grim.webp"
import artwork149 from "../../assets/sprites/gummy-king.webp"
import artwork150 from "../../assets/sprites/gummy-llama.webp"
import artwork151 from "../../assets/sprites/gummy-peely.webp"
import artwork152 from "../../assets/sprites/gummy-punk.webp"
import artwork153 from "../../assets/sprites/gummy-seven.webp"
import artwork154 from "../../assets/sprites/gummy-striker.webp"
import artwork155 from "../../assets/sprites/gummy-water.webp"
import artwork156 from "../../assets/sprites/gummy-zero-point.webp"
import artwork157 from "../../assets/sprites/holofoil-air.webp"
import artwork158 from "../../assets/sprites/holofoil-batman.webp"
import artwork159 from "../../assets/sprites/holofoil-fire.webp"
import artwork160 from "../../assets/sprites/holofoil-ghost.webp"
import artwork161 from "../../assets/sprites/holofoil-grim.webp"
import artwork162 from "../../assets/sprites/holofoil-king.webp"
import artwork163 from "../../assets/sprites/holofoil-peely.webp"
import artwork164 from "../../assets/sprites/holofoil-seven.webp"
import artwork165 from "../../assets/sprites/holofoil-striker.webp"
import artwork166 from "../../assets/sprites/holofoil-water.webp"
import artwork167 from "../../assets/sprites/holofoil-zero-point.webp"
import artwork168 from "../../assets/sprites/ironmouse.webp"
import artwork169 from "../../assets/sprites/jackrabbit.webp"
import artwork170 from "../../assets/sprites/john-wick.webp"
import artwork171 from "../../assets/sprites/jonesy.webp"
import artwork172 from "../../assets/sprites/killswitch.webp"
import artwork173 from "../../assets/sprites/king.webp"
import artwork174 from "../../assets/sprites/klombo.webp"
import artwork175 from "../../assets/sprites/llama.webp"
import artwork176 from "../../assets/sprites/loot-hacker-8-bit.webp"
import artwork177 from "../../assets/sprites/loot-hacker-adventure.webp"
import artwork178 from "../../assets/sprites/loot-hacker-birthday.png"
import artwork179 from "../../assets/sprites/loot-hacker-blinky.webp"
import artwork180 from "../../assets/sprites/loot-hacker-bushranger.webp"
import artwork181 from "../../assets/sprites/loot-hacker-crash-bandicoot.webp"
import artwork182 from "../../assets/sprites/loot-hacker-crown.webp"
import artwork183 from "../../assets/sprites/loot-hacker-jackrabbit.webp"
import artwork184 from "../../assets/sprites/loot-hacker-jonesy.webp"
import artwork185 from "../../assets/sprites/loot-hacker-killswitch.webp"
import artwork186 from "../../assets/sprites/loot-hacker-klombo.webp"
import artwork187 from "../../assets/sprites/loot-hacker-morgana.png"
import artwork188 from "../../assets/sprites/loot-hacker-onigiri.webp"
import artwork189 from "../../assets/sprites/loot-hacker-overshield.webp"
import artwork190 from "../../assets/sprites/loot-hacker-pond.webp"
import artwork191 from "../../assets/sprites/loot-hacker-shadow.webp"
import artwork192 from "../../assets/sprites/loot-hacker-sonic.webp"
import artwork193 from "../../assets/sprites/loot-hacker-storm-scout.webp"
import artwork194 from "../../assets/sprites/loot-hacker-tails.webp"
import artwork195 from "../../assets/sprites/loot-hacker-x-ray.webp"
import artwork196 from "../../assets/sprites/mega-man.webp"
import artwork197 from "../../assets/sprites/morgana.png"
import artwork198 from "../../assets/sprites/onigiri.webp"
import artwork199 from "../../assets/sprites/overshield.webp"
import artwork200 from "../../assets/sprites/peely.webp"
import artwork201 from "../../assets/sprites/pollo.webp"
import artwork202 from "../../assets/sprites/pond.webp"
import artwork203 from "../../assets/sprites/punk.webp"
import artwork204 from "../../assets/sprites/quack-earth.webp"
import artwork205 from "../../assets/sprites/quack-fire.webp"
import artwork206 from "../../assets/sprites/quack-water.webp"
import artwork207 from "../../assets/sprites/quack-zero-point.webp"
import artwork208 from "../../assets/sprites/seven.webp"
import artwork209 from "../../assets/sprites/shadow.webp"
import artwork210 from "../../assets/sprites/sonic.webp"
import artwork211 from "../../assets/sprites/storm-scout.webp"
import artwork212 from "../../assets/sprites/striker.webp"
import artwork213 from "../../assets/sprites/tails.webp"
import artwork214 from "../../assets/sprites/vini-jr.webp"
import artwork215 from "../../assets/sprites/water.webp"
import artwork216 from "../../assets/sprites/x-ray.webp"
import artwork217 from "../../assets/sprites/zero-point.webp"

export const spriteArtwork: Record<string, StaticImageData> = {
  "/sprites/8-bit.webp": artwork0,
  "/sprites/adventure.webp": artwork1,
  "/sprites/air.webp": artwork2,
  "/sprites/aura.webp": artwork3,
  "/sprites/batman.webp": artwork4,
  "/sprites/birthday.png": artwork5,
  "/sprites/blinky.webp": artwork6,
  "/sprites/boss.webp": artwork7,
  "/sprites/bounty-hunter-8-bit.png": artwork8,
  "/sprites/bounty-hunter-adventure.png": artwork9,
  "/sprites/bounty-hunter-birthday.png": artwork10,
  "/sprites/bounty-hunter-blinky.png": artwork11,
  "/sprites/bounty-hunter-body-slam.png": artwork12,
  "/sprites/bounty-hunter-bush.png": artwork13,
  "/sprites/bounty-hunter-crown.webp": artwork14,
  "/sprites/bounty-hunter-jackrabbit.png": artwork15,
  "/sprites/bounty-hunter-jonesy.png": artwork16,
  "/sprites/bounty-hunter-killswitch.png": artwork17,
  "/sprites/bounty-hunter-klombo.png": artwork18,
  "/sprites/bounty-hunter-morgana.png": artwork19,
  "/sprites/bounty-hunter-onigiri.png": artwork20,
  "/sprites/bounty-hunter-overshield.png": artwork21,
  "/sprites/bounty-hunter-pond.png": artwork22,
  "/sprites/bounty-hunter-shadow.png": artwork23,
  "/sprites/bounty-hunter-sonic.png": artwork24,
  "/sprites/bounty-hunter-storm-scout.png": artwork25,
  "/sprites/bounty-hunter-tails.png": artwork26,
  "/sprites/bounty-hunter-x-ray.png": artwork27,
  "/sprites/burnt-peanut.webp": artwork28,
  "/sprites/bush.webp": artwork29,
  "/sprites/cheat-master-8-bit.webp": artwork30,
  "/sprites/cheat-master-adventure.webp": artwork31,
  "/sprites/cheat-master-birthday.png": artwork32,
  "/sprites/cheat-master-blinky.webp": artwork33,
  "/sprites/cheat-master-bush.webp": artwork34,
  "/sprites/cheat-master-crash-bandicoot.webp": artwork35,
  "/sprites/cheat-master-crown.webp": artwork36,
  "/sprites/cheat-master-jackrabbit.webp": artwork37,
  "/sprites/cheat-master-jonesy.webp": artwork38,
  "/sprites/cheat-master-killswitch.webp": artwork39,
  "/sprites/cheat-master-klombo.webp": artwork40,
  "/sprites/cheat-master-morgana.png": artwork41,
  "/sprites/cheat-master-onigiri.webp": artwork42,
  "/sprites/cheat-master-overshield.webp": artwork43,
  "/sprites/cheat-master-pond.webp": artwork44,
  "/sprites/cheat-master-shadow.webp": artwork45,
  "/sprites/cheat-master-sonic.webp": artwork46,
  "/sprites/cheat-master-storm-scout.webp": artwork47,
  "/sprites/cheat-master-tails.webp": artwork48,
  "/sprites/cheat-master-x-ray.webp": artwork49,
  "/sprites/crash-bandicoot.webp": artwork50,
  "/sprites/crown.webp": artwork51,
  "/sprites/cube-batman.webp": artwork52,
  "/sprites/cube-boss.webp": artwork53,
  "/sprites/cube-dream.webp": artwork54,
  "/sprites/cube-earth.webp": artwork55,
  "/sprites/cube-fire.webp": artwork56,
  "/sprites/cube-fishy.webp": artwork57,
  "/sprites/cube-grim.webp": artwork58,
  "/sprites/cube-punk.webp": artwork59,
  "/sprites/cube-zero-point.webp": artwork60,
  "/sprites/demon.webp": artwork61,
  "/sprites/dream.webp": artwork62,
  "/sprites/duck.webp": artwork63,
  "/sprites/earth.webp": artwork64,
  "/sprites/fire.webp": artwork65,
  "/sprites/fishy.webp": artwork66,
  "/sprites/galaxy-air.webp": artwork67,
  "/sprites/galaxy-aura.webp": artwork68,
  "/sprites/galaxy-batman.webp": artwork69,
  "/sprites/galaxy-boss.webp": artwork70,
  "/sprites/galaxy-demon.webp": artwork71,
  "/sprites/galaxy-dream.webp": artwork72,
  "/sprites/galaxy-duck.webp": artwork73,
  "/sprites/galaxy-earth.webp": artwork74,
  "/sprites/galaxy-fire.webp": artwork75,
  "/sprites/galaxy-fishy.webp": artwork76,
  "/sprites/galaxy-ghost.webp": artwork77,
  "/sprites/galaxy-grim.webp": artwork78,
  "/sprites/galaxy-king.webp": artwork79,
  "/sprites/galaxy-llama.webp": artwork80,
  "/sprites/galaxy-peely.webp": artwork81,
  "/sprites/galaxy-punk.webp": artwork82,
  "/sprites/galaxy-seven.webp": artwork83,
  "/sprites/galaxy-striker.webp": artwork84,
  "/sprites/galaxy-water.webp": artwork85,
  "/sprites/galaxy-zero-point.webp": artwork86,
  "/sprites/gem-aura.webp": artwork87,
  "/sprites/gem-demon.webp": artwork88,
  "/sprites/gem-duck.webp": artwork89,
  "/sprites/gem-earth.webp": artwork90,
  "/sprites/gem-grim.webp": artwork91,
  "/sprites/gem-llama.webp": artwork92,
  "/sprites/gem-water.webp": artwork93,
  "/sprites/gem-zero-point.webp": artwork94,
  "/sprites/ghost.webp": artwork95,
  "/sprites/gold-8-bit.webp": artwork96,
  "/sprites/gold-adventure.webp": artwork97,
  "/sprites/gold-air.webp": artwork98,
  "/sprites/gold-aura.webp": artwork99,
  "/sprites/gold-batman.webp": artwork100,
  "/sprites/gold-birthday.png": artwork101,
  "/sprites/gold-blinky.webp": artwork102,
  "/sprites/gold-boss.webp": artwork103,
  "/sprites/gold-bush.webp": artwork104,
  "/sprites/gold-crash-bandicoot.webp": artwork105,
  "/sprites/gold-crown.webp": artwork106,
  "/sprites/gold-demon.webp": artwork107,
  "/sprites/gold-dream.webp": artwork108,
  "/sprites/gold-duck.webp": artwork109,
  "/sprites/gold-earth.webp": artwork110,
  "/sprites/gold-fire.webp": artwork111,
  "/sprites/gold-fishy.webp": artwork112,
  "/sprites/gold-ghost.webp": artwork113,
  "/sprites/gold-grim.webp": artwork114,
  "/sprites/gold-jackrabbit.webp": artwork115,
  "/sprites/gold-jonesy.webp": artwork116,
  "/sprites/gold-killswitch.webp": artwork117,
  "/sprites/gold-king.webp": artwork118,
  "/sprites/gold-klombo.webp": artwork119,
  "/sprites/gold-llama.webp": artwork120,
  "/sprites/gold-morgana.png": artwork121,
  "/sprites/gold-onigiri.webp": artwork122,
  "/sprites/gold-overshield.webp": artwork123,
  "/sprites/gold-peely.webp": artwork124,
  "/sprites/gold-pond.webp": artwork125,
  "/sprites/gold-punk.webp": artwork126,
  "/sprites/gold-seven.webp": artwork127,
  "/sprites/gold-shadow.webp": artwork128,
  "/sprites/gold-sonic.webp": artwork129,
  "/sprites/gold-storm-scout.webp": artwork130,
  "/sprites/gold-striker.webp": artwork131,
  "/sprites/gold-tails.webp": artwork132,
  "/sprites/gold-water.webp": artwork133,
  "/sprites/gold-x-ray.webp": artwork134,
  "/sprites/gold-zero-point.webp": artwork135,
  "/sprites/grim.webp": artwork136,
  "/sprites/gummy-air.webp": artwork137,
  "/sprites/gummy-aura.webp": artwork138,
  "/sprites/gummy-batman.webp": artwork139,
  "/sprites/gummy-boss.webp": artwork140,
  "/sprites/gummy-demon.webp": artwork141,
  "/sprites/gummy-dream.webp": artwork142,
  "/sprites/gummy-duck.webp": artwork143,
  "/sprites/gummy-earth.webp": artwork144,
  "/sprites/gummy-fire.webp": artwork145,
  "/sprites/gummy-fishy.webp": artwork146,
  "/sprites/gummy-ghost.webp": artwork147,
  "/sprites/gummy-grim.webp": artwork148,
  "/sprites/gummy-king.webp": artwork149,
  "/sprites/gummy-llama.webp": artwork150,
  "/sprites/gummy-peely.webp": artwork151,
  "/sprites/gummy-punk.webp": artwork152,
  "/sprites/gummy-seven.webp": artwork153,
  "/sprites/gummy-striker.webp": artwork154,
  "/sprites/gummy-water.webp": artwork155,
  "/sprites/gummy-zero-point.webp": artwork156,
  "/sprites/holofoil-air.webp": artwork157,
  "/sprites/holofoil-batman.webp": artwork158,
  "/sprites/holofoil-fire.webp": artwork159,
  "/sprites/holofoil-ghost.webp": artwork160,
  "/sprites/holofoil-grim.webp": artwork161,
  "/sprites/holofoil-king.webp": artwork162,
  "/sprites/holofoil-peely.webp": artwork163,
  "/sprites/holofoil-seven.webp": artwork164,
  "/sprites/holofoil-striker.webp": artwork165,
  "/sprites/holofoil-water.webp": artwork166,
  "/sprites/holofoil-zero-point.webp": artwork167,
  "/sprites/ironmouse.webp": artwork168,
  "/sprites/jackrabbit.webp": artwork169,
  "/sprites/john-wick.webp": artwork170,
  "/sprites/jonesy.webp": artwork171,
  "/sprites/killswitch.webp": artwork172,
  "/sprites/king.webp": artwork173,
  "/sprites/klombo.webp": artwork174,
  "/sprites/llama.webp": artwork175,
  "/sprites/loot-hacker-8-bit.webp": artwork176,
  "/sprites/loot-hacker-adventure.webp": artwork177,
  "/sprites/loot-hacker-birthday.png": artwork178,
  "/sprites/loot-hacker-blinky.webp": artwork179,
  "/sprites/loot-hacker-bushranger.webp": artwork180,
  "/sprites/loot-hacker-crash-bandicoot.webp": artwork181,
  "/sprites/loot-hacker-crown.webp": artwork182,
  "/sprites/loot-hacker-jackrabbit.webp": artwork183,
  "/sprites/loot-hacker-jonesy.webp": artwork184,
  "/sprites/loot-hacker-killswitch.webp": artwork185,
  "/sprites/loot-hacker-klombo.webp": artwork186,
  "/sprites/loot-hacker-morgana.png": artwork187,
  "/sprites/loot-hacker-onigiri.webp": artwork188,
  "/sprites/loot-hacker-overshield.webp": artwork189,
  "/sprites/loot-hacker-pond.webp": artwork190,
  "/sprites/loot-hacker-shadow.webp": artwork191,
  "/sprites/loot-hacker-sonic.webp": artwork192,
  "/sprites/loot-hacker-storm-scout.webp": artwork193,
  "/sprites/loot-hacker-tails.webp": artwork194,
  "/sprites/loot-hacker-x-ray.webp": artwork195,
  "/sprites/mega-man.webp": artwork196,
  "/sprites/morgana.png": artwork197,
  "/sprites/onigiri.webp": artwork198,
  "/sprites/overshield.webp": artwork199,
  "/sprites/peely.webp": artwork200,
  "/sprites/pollo.webp": artwork201,
  "/sprites/pond.webp": artwork202,
  "/sprites/punk.webp": artwork203,
  "/sprites/quack-earth.webp": artwork204,
  "/sprites/quack-fire.webp": artwork205,
  "/sprites/quack-water.webp": artwork206,
  "/sprites/quack-zero-point.webp": artwork207,
  "/sprites/seven.webp": artwork208,
  "/sprites/shadow.webp": artwork209,
  "/sprites/sonic.webp": artwork210,
  "/sprites/storm-scout.webp": artwork211,
  "/sprites/striker.webp": artwork212,
  "/sprites/tails.webp": artwork213,
  "/sprites/vini-jr.webp": artwork214,
  "/sprites/water.webp": artwork215,
  "/sprites/x-ray.webp": artwork216,
  "/sprites/zero-point.webp": artwork217,
}

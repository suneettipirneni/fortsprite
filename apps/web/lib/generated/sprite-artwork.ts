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
import artwork15 from "../../assets/sprites/bounty-hunter-dumpster-dive.webp"
import artwork16 from "../../assets/sprites/bounty-hunter-jackrabbit.png"
import artwork17 from "../../assets/sprites/bounty-hunter-jonesy.png"
import artwork18 from "../../assets/sprites/bounty-hunter-killswitch.png"
import artwork19 from "../../assets/sprites/bounty-hunter-klombo.png"
import artwork20 from "../../assets/sprites/bounty-hunter-morgana.png"
import artwork21 from "../../assets/sprites/bounty-hunter-onigiri.png"
import artwork22 from "../../assets/sprites/bounty-hunter-overshield.png"
import artwork23 from "../../assets/sprites/bounty-hunter-pond.png"
import artwork24 from "../../assets/sprites/bounty-hunter-shadow.png"
import artwork25 from "../../assets/sprites/bounty-hunter-sonic.png"
import artwork26 from "../../assets/sprites/bounty-hunter-spooky-dash.webp"
import artwork27 from "../../assets/sprites/bounty-hunter-storm-scout.png"
import artwork28 from "../../assets/sprites/bounty-hunter-tails.png"
import artwork29 from "../../assets/sprites/bounty-hunter-the-deer.webp"
import artwork30 from "../../assets/sprites/bounty-hunter-vampire.webp"
import artwork31 from "../../assets/sprites/bounty-hunter-x-ray.png"
import artwork32 from "../../assets/sprites/burnt-peanut.webp"
import artwork33 from "../../assets/sprites/bush.webp"
import artwork34 from "../../assets/sprites/cheat-master-8-bit.webp"
import artwork35 from "../../assets/sprites/cheat-master-adventure.webp"
import artwork36 from "../../assets/sprites/cheat-master-birthday.png"
import artwork37 from "../../assets/sprites/cheat-master-blinky.webp"
import artwork38 from "../../assets/sprites/cheat-master-bush.webp"
import artwork39 from "../../assets/sprites/cheat-master-crash-bandicoot.webp"
import artwork40 from "../../assets/sprites/cheat-master-crown.webp"
import artwork41 from "../../assets/sprites/cheat-master-dumpster-dive.webp"
import artwork42 from "../../assets/sprites/cheat-master-jackrabbit.webp"
import artwork43 from "../../assets/sprites/cheat-master-jonesy.webp"
import artwork44 from "../../assets/sprites/cheat-master-killswitch.webp"
import artwork45 from "../../assets/sprites/cheat-master-klombo.webp"
import artwork46 from "../../assets/sprites/cheat-master-morgana.png"
import artwork47 from "../../assets/sprites/cheat-master-onigiri.webp"
import artwork48 from "../../assets/sprites/cheat-master-overshield.webp"
import artwork49 from "../../assets/sprites/cheat-master-pond.webp"
import artwork50 from "../../assets/sprites/cheat-master-shadow.webp"
import artwork51 from "../../assets/sprites/cheat-master-sonic.webp"
import artwork52 from "../../assets/sprites/cheat-master-spooky-dash.webp"
import artwork53 from "../../assets/sprites/cheat-master-storm-scout.webp"
import artwork54 from "../../assets/sprites/cheat-master-tails.webp"
import artwork55 from "../../assets/sprites/cheat-master-the-deer.webp"
import artwork56 from "../../assets/sprites/cheat-master-vampire.webp"
import artwork57 from "../../assets/sprites/cheat-master-x-ray.webp"
import artwork58 from "../../assets/sprites/crash-bandicoot.webp"
import artwork59 from "../../assets/sprites/crown.webp"
import artwork60 from "../../assets/sprites/cube-batman.webp"
import artwork61 from "../../assets/sprites/cube-boss.webp"
import artwork62 from "../../assets/sprites/cube-dream.webp"
import artwork63 from "../../assets/sprites/cube-earth.webp"
import artwork64 from "../../assets/sprites/cube-fire.webp"
import artwork65 from "../../assets/sprites/cube-fishy.webp"
import artwork66 from "../../assets/sprites/cube-grim.webp"
import artwork67 from "../../assets/sprites/cube-punk.webp"
import artwork68 from "../../assets/sprites/cube-zero-point.webp"
import artwork69 from "../../assets/sprites/demon.webp"
import artwork70 from "../../assets/sprites/dream.webp"
import artwork71 from "../../assets/sprites/duck.webp"
import artwork72 from "../../assets/sprites/dumpster-dive.webp"
import artwork73 from "../../assets/sprites/earth.webp"
import artwork74 from "../../assets/sprites/fire.webp"
import artwork75 from "../../assets/sprites/fishy.webp"
import artwork76 from "../../assets/sprites/galaxy-air.webp"
import artwork77 from "../../assets/sprites/galaxy-aura.webp"
import artwork78 from "../../assets/sprites/galaxy-batman.webp"
import artwork79 from "../../assets/sprites/galaxy-boss.webp"
import artwork80 from "../../assets/sprites/galaxy-demon.webp"
import artwork81 from "../../assets/sprites/galaxy-dream.webp"
import artwork82 from "../../assets/sprites/galaxy-duck.webp"
import artwork83 from "../../assets/sprites/galaxy-earth.webp"
import artwork84 from "../../assets/sprites/galaxy-fire.webp"
import artwork85 from "../../assets/sprites/galaxy-fishy.webp"
import artwork86 from "../../assets/sprites/galaxy-ghost.webp"
import artwork87 from "../../assets/sprites/galaxy-grim.webp"
import artwork88 from "../../assets/sprites/galaxy-king.webp"
import artwork89 from "../../assets/sprites/galaxy-llama.webp"
import artwork90 from "../../assets/sprites/galaxy-peely.webp"
import artwork91 from "../../assets/sprites/galaxy-punk.webp"
import artwork92 from "../../assets/sprites/galaxy-seven.webp"
import artwork93 from "../../assets/sprites/galaxy-striker.webp"
import artwork94 from "../../assets/sprites/galaxy-water.webp"
import artwork95 from "../../assets/sprites/galaxy-zero-point.webp"
import artwork96 from "../../assets/sprites/gem-aura.webp"
import artwork97 from "../../assets/sprites/gem-demon.webp"
import artwork98 from "../../assets/sprites/gem-duck.webp"
import artwork99 from "../../assets/sprites/gem-earth.webp"
import artwork100 from "../../assets/sprites/gem-grim.webp"
import artwork101 from "../../assets/sprites/gem-llama.webp"
import artwork102 from "../../assets/sprites/gem-water.webp"
import artwork103 from "../../assets/sprites/gem-zero-point.webp"
import artwork104 from "../../assets/sprites/ghost.webp"
import artwork105 from "../../assets/sprites/gold-8-bit.webp"
import artwork106 from "../../assets/sprites/gold-adventure.webp"
import artwork107 from "../../assets/sprites/gold-air.webp"
import artwork108 from "../../assets/sprites/gold-aura.webp"
import artwork109 from "../../assets/sprites/gold-batman.webp"
import artwork110 from "../../assets/sprites/gold-birthday.png"
import artwork111 from "../../assets/sprites/gold-blinky.webp"
import artwork112 from "../../assets/sprites/gold-boss.webp"
import artwork113 from "../../assets/sprites/gold-bush.webp"
import artwork114 from "../../assets/sprites/gold-crash-bandicoot.webp"
import artwork115 from "../../assets/sprites/gold-crown.webp"
import artwork116 from "../../assets/sprites/gold-demon.webp"
import artwork117 from "../../assets/sprites/gold-dream.webp"
import artwork118 from "../../assets/sprites/gold-duck.webp"
import artwork119 from "../../assets/sprites/gold-dumpster-dive.webp"
import artwork120 from "../../assets/sprites/gold-earth.webp"
import artwork121 from "../../assets/sprites/gold-fire.webp"
import artwork122 from "../../assets/sprites/gold-fishy.webp"
import artwork123 from "../../assets/sprites/gold-ghost.webp"
import artwork124 from "../../assets/sprites/gold-grim.webp"
import artwork125 from "../../assets/sprites/gold-jackrabbit.webp"
import artwork126 from "../../assets/sprites/gold-jonesy.webp"
import artwork127 from "../../assets/sprites/gold-killswitch.webp"
import artwork128 from "../../assets/sprites/gold-king.webp"
import artwork129 from "../../assets/sprites/gold-klombo.webp"
import artwork130 from "../../assets/sprites/gold-llama.webp"
import artwork131 from "../../assets/sprites/gold-morgana.png"
import artwork132 from "../../assets/sprites/gold-onigiri.webp"
import artwork133 from "../../assets/sprites/gold-overshield.webp"
import artwork134 from "../../assets/sprites/gold-peely.webp"
import artwork135 from "../../assets/sprites/gold-pond.webp"
import artwork136 from "../../assets/sprites/gold-punk.webp"
import artwork137 from "../../assets/sprites/gold-seven.webp"
import artwork138 from "../../assets/sprites/gold-shadow.webp"
import artwork139 from "../../assets/sprites/gold-sonic.webp"
import artwork140 from "../../assets/sprites/gold-spooky-dash.webp"
import artwork141 from "../../assets/sprites/gold-storm-scout.webp"
import artwork142 from "../../assets/sprites/gold-striker.webp"
import artwork143 from "../../assets/sprites/gold-tails.webp"
import artwork144 from "../../assets/sprites/gold-the-deer.webp"
import artwork145 from "../../assets/sprites/gold-vampire.webp"
import artwork146 from "../../assets/sprites/gold-water.webp"
import artwork147 from "../../assets/sprites/gold-x-ray.webp"
import artwork148 from "../../assets/sprites/gold-zero-point.webp"
import artwork149 from "../../assets/sprites/grim.webp"
import artwork150 from "../../assets/sprites/gummy-air.webp"
import artwork151 from "../../assets/sprites/gummy-aura.webp"
import artwork152 from "../../assets/sprites/gummy-batman.webp"
import artwork153 from "../../assets/sprites/gummy-boss.webp"
import artwork154 from "../../assets/sprites/gummy-demon.webp"
import artwork155 from "../../assets/sprites/gummy-dream.webp"
import artwork156 from "../../assets/sprites/gummy-duck.webp"
import artwork157 from "../../assets/sprites/gummy-earth.webp"
import artwork158 from "../../assets/sprites/gummy-fire.webp"
import artwork159 from "../../assets/sprites/gummy-fishy.webp"
import artwork160 from "../../assets/sprites/gummy-ghost.webp"
import artwork161 from "../../assets/sprites/gummy-grim.webp"
import artwork162 from "../../assets/sprites/gummy-king.webp"
import artwork163 from "../../assets/sprites/gummy-llama.webp"
import artwork164 from "../../assets/sprites/gummy-peely.webp"
import artwork165 from "../../assets/sprites/gummy-punk.webp"
import artwork166 from "../../assets/sprites/gummy-seven.webp"
import artwork167 from "../../assets/sprites/gummy-striker.webp"
import artwork168 from "../../assets/sprites/gummy-water.webp"
import artwork169 from "../../assets/sprites/gummy-zero-point.webp"
import artwork170 from "../../assets/sprites/holofoil-air.webp"
import artwork171 from "../../assets/sprites/holofoil-batman.webp"
import artwork172 from "../../assets/sprites/holofoil-fire.webp"
import artwork173 from "../../assets/sprites/holofoil-ghost.webp"
import artwork174 from "../../assets/sprites/holofoil-grim.webp"
import artwork175 from "../../assets/sprites/holofoil-king.webp"
import artwork176 from "../../assets/sprites/holofoil-peely.webp"
import artwork177 from "../../assets/sprites/holofoil-seven.webp"
import artwork178 from "../../assets/sprites/holofoil-striker.webp"
import artwork179 from "../../assets/sprites/holofoil-water.webp"
import artwork180 from "../../assets/sprites/holofoil-zero-point.webp"
import artwork181 from "../../assets/sprites/ironmouse.webp"
import artwork182 from "../../assets/sprites/jackrabbit.webp"
import artwork183 from "../../assets/sprites/john-wick.webp"
import artwork184 from "../../assets/sprites/jonesy.webp"
import artwork185 from "../../assets/sprites/killswitch.webp"
import artwork186 from "../../assets/sprites/king.webp"
import artwork187 from "../../assets/sprites/klombo.webp"
import artwork188 from "../../assets/sprites/llama.webp"
import artwork189 from "../../assets/sprites/loot-hacker-8-bit.webp"
import artwork190 from "../../assets/sprites/loot-hacker-adventure.webp"
import artwork191 from "../../assets/sprites/loot-hacker-birthday.png"
import artwork192 from "../../assets/sprites/loot-hacker-blinky.webp"
import artwork193 from "../../assets/sprites/loot-hacker-bushranger.webp"
import artwork194 from "../../assets/sprites/loot-hacker-crash-bandicoot.webp"
import artwork195 from "../../assets/sprites/loot-hacker-crown.webp"
import artwork196 from "../../assets/sprites/loot-hacker-dumpster-dive.webp"
import artwork197 from "../../assets/sprites/loot-hacker-jackrabbit.webp"
import artwork198 from "../../assets/sprites/loot-hacker-jonesy.webp"
import artwork199 from "../../assets/sprites/loot-hacker-killswitch.webp"
import artwork200 from "../../assets/sprites/loot-hacker-klombo.webp"
import artwork201 from "../../assets/sprites/loot-hacker-morgana.png"
import artwork202 from "../../assets/sprites/loot-hacker-onigiri.webp"
import artwork203 from "../../assets/sprites/loot-hacker-overshield.webp"
import artwork204 from "../../assets/sprites/loot-hacker-pond.webp"
import artwork205 from "../../assets/sprites/loot-hacker-shadow.webp"
import artwork206 from "../../assets/sprites/loot-hacker-sonic.webp"
import artwork207 from "../../assets/sprites/loot-hacker-spooky-dash.webp"
import artwork208 from "../../assets/sprites/loot-hacker-storm-scout.webp"
import artwork209 from "../../assets/sprites/loot-hacker-tails.webp"
import artwork210 from "../../assets/sprites/loot-hacker-the-deer.webp"
import artwork211 from "../../assets/sprites/loot-hacker-vampire.webp"
import artwork212 from "../../assets/sprites/loot-hacker-x-ray.webp"
import artwork213 from "../../assets/sprites/mega-man.webp"
import artwork214 from "../../assets/sprites/morgana.png"
import artwork215 from "../../assets/sprites/onigiri.webp"
import artwork216 from "../../assets/sprites/overshield.webp"
import artwork217 from "../../assets/sprites/peely.webp"
import artwork218 from "../../assets/sprites/pollo.webp"
import artwork219 from "../../assets/sprites/pond.webp"
import artwork220 from "../../assets/sprites/punk.webp"
import artwork221 from "../../assets/sprites/quack-earth.webp"
import artwork222 from "../../assets/sprites/quack-fire.webp"
import artwork223 from "../../assets/sprites/quack-water.webp"
import artwork224 from "../../assets/sprites/quack-zero-point.webp"
import artwork225 from "../../assets/sprites/seven.webp"
import artwork226 from "../../assets/sprites/shadow.webp"
import artwork227 from "../../assets/sprites/sonic.webp"
import artwork228 from "../../assets/sprites/spooky-dash.webp"
import artwork229 from "../../assets/sprites/storm-scout.webp"
import artwork230 from "../../assets/sprites/striker.webp"
import artwork231 from "../../assets/sprites/tails.webp"
import artwork232 from "../../assets/sprites/the-deer.webp"
import artwork233 from "../../assets/sprites/trick-or-treat-8-bit.webp"
import artwork234 from "../../assets/sprites/trick-or-treat-adventure.webp"
import artwork235 from "../../assets/sprites/trick-or-treat-birthday.webp"
import artwork236 from "../../assets/sprites/trick-or-treat-blinky.webp"
import artwork237 from "../../assets/sprites/trick-or-treat-bush.webp"
import artwork238 from "../../assets/sprites/trick-or-treat-crash-bandicoot.webp"
import artwork239 from "../../assets/sprites/trick-or-treat-crown.webp"
import artwork240 from "../../assets/sprites/trick-or-treat-dumpster-dive.webp"
import artwork241 from "../../assets/sprites/trick-or-treat-jackrabbit.webp"
import artwork242 from "../../assets/sprites/trick-or-treat-jonesy.webp"
import artwork243 from "../../assets/sprites/trick-or-treat-killswitch.webp"
import artwork244 from "../../assets/sprites/trick-or-treat-klombo.webp"
import artwork245 from "../../assets/sprites/trick-or-treat-morgana.webp"
import artwork246 from "../../assets/sprites/trick-or-treat-onigiri.webp"
import artwork247 from "../../assets/sprites/trick-or-treat-overshield.webp"
import artwork248 from "../../assets/sprites/trick-or-treat-pond.webp"
import artwork249 from "../../assets/sprites/trick-or-treat-shadow.webp"
import artwork250 from "../../assets/sprites/trick-or-treat-sonic.webp"
import artwork251 from "../../assets/sprites/trick-or-treat-spooky-dash.webp"
import artwork252 from "../../assets/sprites/trick-or-treat-storm-scout.webp"
import artwork253 from "../../assets/sprites/trick-or-treat-tails.webp"
import artwork254 from "../../assets/sprites/trick-or-treat-the-deer.webp"
import artwork255 from "../../assets/sprites/trick-or-treat-vampire.webp"
import artwork256 from "../../assets/sprites/trick-or-treat-x-ray.webp"
import artwork257 from "../../assets/sprites/vampire.webp"
import artwork258 from "../../assets/sprites/vini-jr.webp"
import artwork259 from "../../assets/sprites/water.webp"
import artwork260 from "../../assets/sprites/x-ray.webp"
import artwork261 from "../../assets/sprites/zero-point.webp"

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
  "/sprites/bounty-hunter-dumpster-dive.webp": artwork15,
  "/sprites/bounty-hunter-jackrabbit.png": artwork16,
  "/sprites/bounty-hunter-jonesy.png": artwork17,
  "/sprites/bounty-hunter-killswitch.png": artwork18,
  "/sprites/bounty-hunter-klombo.png": artwork19,
  "/sprites/bounty-hunter-morgana.png": artwork20,
  "/sprites/bounty-hunter-onigiri.png": artwork21,
  "/sprites/bounty-hunter-overshield.png": artwork22,
  "/sprites/bounty-hunter-pond.png": artwork23,
  "/sprites/bounty-hunter-shadow.png": artwork24,
  "/sprites/bounty-hunter-sonic.png": artwork25,
  "/sprites/bounty-hunter-spooky-dash.webp": artwork26,
  "/sprites/bounty-hunter-storm-scout.png": artwork27,
  "/sprites/bounty-hunter-tails.png": artwork28,
  "/sprites/bounty-hunter-the-deer.webp": artwork29,
  "/sprites/bounty-hunter-vampire.webp": artwork30,
  "/sprites/bounty-hunter-x-ray.png": artwork31,
  "/sprites/burnt-peanut.webp": artwork32,
  "/sprites/bush.webp": artwork33,
  "/sprites/cheat-master-8-bit.webp": artwork34,
  "/sprites/cheat-master-adventure.webp": artwork35,
  "/sprites/cheat-master-birthday.png": artwork36,
  "/sprites/cheat-master-blinky.webp": artwork37,
  "/sprites/cheat-master-bush.webp": artwork38,
  "/sprites/cheat-master-crash-bandicoot.webp": artwork39,
  "/sprites/cheat-master-crown.webp": artwork40,
  "/sprites/cheat-master-dumpster-dive.webp": artwork41,
  "/sprites/cheat-master-jackrabbit.webp": artwork42,
  "/sprites/cheat-master-jonesy.webp": artwork43,
  "/sprites/cheat-master-killswitch.webp": artwork44,
  "/sprites/cheat-master-klombo.webp": artwork45,
  "/sprites/cheat-master-morgana.png": artwork46,
  "/sprites/cheat-master-onigiri.webp": artwork47,
  "/sprites/cheat-master-overshield.webp": artwork48,
  "/sprites/cheat-master-pond.webp": artwork49,
  "/sprites/cheat-master-shadow.webp": artwork50,
  "/sprites/cheat-master-sonic.webp": artwork51,
  "/sprites/cheat-master-spooky-dash.webp": artwork52,
  "/sprites/cheat-master-storm-scout.webp": artwork53,
  "/sprites/cheat-master-tails.webp": artwork54,
  "/sprites/cheat-master-the-deer.webp": artwork55,
  "/sprites/cheat-master-vampire.webp": artwork56,
  "/sprites/cheat-master-x-ray.webp": artwork57,
  "/sprites/crash-bandicoot.webp": artwork58,
  "/sprites/crown.webp": artwork59,
  "/sprites/cube-batman.webp": artwork60,
  "/sprites/cube-boss.webp": artwork61,
  "/sprites/cube-dream.webp": artwork62,
  "/sprites/cube-earth.webp": artwork63,
  "/sprites/cube-fire.webp": artwork64,
  "/sprites/cube-fishy.webp": artwork65,
  "/sprites/cube-grim.webp": artwork66,
  "/sprites/cube-punk.webp": artwork67,
  "/sprites/cube-zero-point.webp": artwork68,
  "/sprites/demon.webp": artwork69,
  "/sprites/dream.webp": artwork70,
  "/sprites/duck.webp": artwork71,
  "/sprites/dumpster-dive.webp": artwork72,
  "/sprites/earth.webp": artwork73,
  "/sprites/fire.webp": artwork74,
  "/sprites/fishy.webp": artwork75,
  "/sprites/galaxy-air.webp": artwork76,
  "/sprites/galaxy-aura.webp": artwork77,
  "/sprites/galaxy-batman.webp": artwork78,
  "/sprites/galaxy-boss.webp": artwork79,
  "/sprites/galaxy-demon.webp": artwork80,
  "/sprites/galaxy-dream.webp": artwork81,
  "/sprites/galaxy-duck.webp": artwork82,
  "/sprites/galaxy-earth.webp": artwork83,
  "/sprites/galaxy-fire.webp": artwork84,
  "/sprites/galaxy-fishy.webp": artwork85,
  "/sprites/galaxy-ghost.webp": artwork86,
  "/sprites/galaxy-grim.webp": artwork87,
  "/sprites/galaxy-king.webp": artwork88,
  "/sprites/galaxy-llama.webp": artwork89,
  "/sprites/galaxy-peely.webp": artwork90,
  "/sprites/galaxy-punk.webp": artwork91,
  "/sprites/galaxy-seven.webp": artwork92,
  "/sprites/galaxy-striker.webp": artwork93,
  "/sprites/galaxy-water.webp": artwork94,
  "/sprites/galaxy-zero-point.webp": artwork95,
  "/sprites/gem-aura.webp": artwork96,
  "/sprites/gem-demon.webp": artwork97,
  "/sprites/gem-duck.webp": artwork98,
  "/sprites/gem-earth.webp": artwork99,
  "/sprites/gem-grim.webp": artwork100,
  "/sprites/gem-llama.webp": artwork101,
  "/sprites/gem-water.webp": artwork102,
  "/sprites/gem-zero-point.webp": artwork103,
  "/sprites/ghost.webp": artwork104,
  "/sprites/gold-8-bit.webp": artwork105,
  "/sprites/gold-adventure.webp": artwork106,
  "/sprites/gold-air.webp": artwork107,
  "/sprites/gold-aura.webp": artwork108,
  "/sprites/gold-batman.webp": artwork109,
  "/sprites/gold-birthday.png": artwork110,
  "/sprites/gold-blinky.webp": artwork111,
  "/sprites/gold-boss.webp": artwork112,
  "/sprites/gold-bush.webp": artwork113,
  "/sprites/gold-crash-bandicoot.webp": artwork114,
  "/sprites/gold-crown.webp": artwork115,
  "/sprites/gold-demon.webp": artwork116,
  "/sprites/gold-dream.webp": artwork117,
  "/sprites/gold-duck.webp": artwork118,
  "/sprites/gold-dumpster-dive.webp": artwork119,
  "/sprites/gold-earth.webp": artwork120,
  "/sprites/gold-fire.webp": artwork121,
  "/sprites/gold-fishy.webp": artwork122,
  "/sprites/gold-ghost.webp": artwork123,
  "/sprites/gold-grim.webp": artwork124,
  "/sprites/gold-jackrabbit.webp": artwork125,
  "/sprites/gold-jonesy.webp": artwork126,
  "/sprites/gold-killswitch.webp": artwork127,
  "/sprites/gold-king.webp": artwork128,
  "/sprites/gold-klombo.webp": artwork129,
  "/sprites/gold-llama.webp": artwork130,
  "/sprites/gold-morgana.png": artwork131,
  "/sprites/gold-onigiri.webp": artwork132,
  "/sprites/gold-overshield.webp": artwork133,
  "/sprites/gold-peely.webp": artwork134,
  "/sprites/gold-pond.webp": artwork135,
  "/sprites/gold-punk.webp": artwork136,
  "/sprites/gold-seven.webp": artwork137,
  "/sprites/gold-shadow.webp": artwork138,
  "/sprites/gold-sonic.webp": artwork139,
  "/sprites/gold-spooky-dash.webp": artwork140,
  "/sprites/gold-storm-scout.webp": artwork141,
  "/sprites/gold-striker.webp": artwork142,
  "/sprites/gold-tails.webp": artwork143,
  "/sprites/gold-the-deer.webp": artwork144,
  "/sprites/gold-vampire.webp": artwork145,
  "/sprites/gold-water.webp": artwork146,
  "/sprites/gold-x-ray.webp": artwork147,
  "/sprites/gold-zero-point.webp": artwork148,
  "/sprites/grim.webp": artwork149,
  "/sprites/gummy-air.webp": artwork150,
  "/sprites/gummy-aura.webp": artwork151,
  "/sprites/gummy-batman.webp": artwork152,
  "/sprites/gummy-boss.webp": artwork153,
  "/sprites/gummy-demon.webp": artwork154,
  "/sprites/gummy-dream.webp": artwork155,
  "/sprites/gummy-duck.webp": artwork156,
  "/sprites/gummy-earth.webp": artwork157,
  "/sprites/gummy-fire.webp": artwork158,
  "/sprites/gummy-fishy.webp": artwork159,
  "/sprites/gummy-ghost.webp": artwork160,
  "/sprites/gummy-grim.webp": artwork161,
  "/sprites/gummy-king.webp": artwork162,
  "/sprites/gummy-llama.webp": artwork163,
  "/sprites/gummy-peely.webp": artwork164,
  "/sprites/gummy-punk.webp": artwork165,
  "/sprites/gummy-seven.webp": artwork166,
  "/sprites/gummy-striker.webp": artwork167,
  "/sprites/gummy-water.webp": artwork168,
  "/sprites/gummy-zero-point.webp": artwork169,
  "/sprites/holofoil-air.webp": artwork170,
  "/sprites/holofoil-batman.webp": artwork171,
  "/sprites/holofoil-fire.webp": artwork172,
  "/sprites/holofoil-ghost.webp": artwork173,
  "/sprites/holofoil-grim.webp": artwork174,
  "/sprites/holofoil-king.webp": artwork175,
  "/sprites/holofoil-peely.webp": artwork176,
  "/sprites/holofoil-seven.webp": artwork177,
  "/sprites/holofoil-striker.webp": artwork178,
  "/sprites/holofoil-water.webp": artwork179,
  "/sprites/holofoil-zero-point.webp": artwork180,
  "/sprites/ironmouse.webp": artwork181,
  "/sprites/jackrabbit.webp": artwork182,
  "/sprites/john-wick.webp": artwork183,
  "/sprites/jonesy.webp": artwork184,
  "/sprites/killswitch.webp": artwork185,
  "/sprites/king.webp": artwork186,
  "/sprites/klombo.webp": artwork187,
  "/sprites/llama.webp": artwork188,
  "/sprites/loot-hacker-8-bit.webp": artwork189,
  "/sprites/loot-hacker-adventure.webp": artwork190,
  "/sprites/loot-hacker-birthday.png": artwork191,
  "/sprites/loot-hacker-blinky.webp": artwork192,
  "/sprites/loot-hacker-bushranger.webp": artwork193,
  "/sprites/loot-hacker-crash-bandicoot.webp": artwork194,
  "/sprites/loot-hacker-crown.webp": artwork195,
  "/sprites/loot-hacker-dumpster-dive.webp": artwork196,
  "/sprites/loot-hacker-jackrabbit.webp": artwork197,
  "/sprites/loot-hacker-jonesy.webp": artwork198,
  "/sprites/loot-hacker-killswitch.webp": artwork199,
  "/sprites/loot-hacker-klombo.webp": artwork200,
  "/sprites/loot-hacker-morgana.png": artwork201,
  "/sprites/loot-hacker-onigiri.webp": artwork202,
  "/sprites/loot-hacker-overshield.webp": artwork203,
  "/sprites/loot-hacker-pond.webp": artwork204,
  "/sprites/loot-hacker-shadow.webp": artwork205,
  "/sprites/loot-hacker-sonic.webp": artwork206,
  "/sprites/loot-hacker-spooky-dash.webp": artwork207,
  "/sprites/loot-hacker-storm-scout.webp": artwork208,
  "/sprites/loot-hacker-tails.webp": artwork209,
  "/sprites/loot-hacker-the-deer.webp": artwork210,
  "/sprites/loot-hacker-vampire.webp": artwork211,
  "/sprites/loot-hacker-x-ray.webp": artwork212,
  "/sprites/mega-man.webp": artwork213,
  "/sprites/morgana.png": artwork214,
  "/sprites/onigiri.webp": artwork215,
  "/sprites/overshield.webp": artwork216,
  "/sprites/peely.webp": artwork217,
  "/sprites/pollo.webp": artwork218,
  "/sprites/pond.webp": artwork219,
  "/sprites/punk.webp": artwork220,
  "/sprites/quack-earth.webp": artwork221,
  "/sprites/quack-fire.webp": artwork222,
  "/sprites/quack-water.webp": artwork223,
  "/sprites/quack-zero-point.webp": artwork224,
  "/sprites/seven.webp": artwork225,
  "/sprites/shadow.webp": artwork226,
  "/sprites/sonic.webp": artwork227,
  "/sprites/spooky-dash.webp": artwork228,
  "/sprites/storm-scout.webp": artwork229,
  "/sprites/striker.webp": artwork230,
  "/sprites/tails.webp": artwork231,
  "/sprites/the-deer.webp": artwork232,
  "/sprites/trick-or-treat-8-bit.webp": artwork233,
  "/sprites/trick-or-treat-adventure.webp": artwork234,
  "/sprites/trick-or-treat-birthday.webp": artwork235,
  "/sprites/trick-or-treat-blinky.webp": artwork236,
  "/sprites/trick-or-treat-bush.webp": artwork237,
  "/sprites/trick-or-treat-crash-bandicoot.webp": artwork238,
  "/sprites/trick-or-treat-crown.webp": artwork239,
  "/sprites/trick-or-treat-dumpster-dive.webp": artwork240,
  "/sprites/trick-or-treat-jackrabbit.webp": artwork241,
  "/sprites/trick-or-treat-jonesy.webp": artwork242,
  "/sprites/trick-or-treat-killswitch.webp": artwork243,
  "/sprites/trick-or-treat-klombo.webp": artwork244,
  "/sprites/trick-or-treat-morgana.webp": artwork245,
  "/sprites/trick-or-treat-onigiri.webp": artwork246,
  "/sprites/trick-or-treat-overshield.webp": artwork247,
  "/sprites/trick-or-treat-pond.webp": artwork248,
  "/sprites/trick-or-treat-shadow.webp": artwork249,
  "/sprites/trick-or-treat-sonic.webp": artwork250,
  "/sprites/trick-or-treat-spooky-dash.webp": artwork251,
  "/sprites/trick-or-treat-storm-scout.webp": artwork252,
  "/sprites/trick-or-treat-tails.webp": artwork253,
  "/sprites/trick-or-treat-the-deer.webp": artwork254,
  "/sprites/trick-or-treat-vampire.webp": artwork255,
  "/sprites/trick-or-treat-x-ray.webp": artwork256,
  "/sprites/vampire.webp": artwork257,
  "/sprites/vini-jr.webp": artwork258,
  "/sprites/water.webp": artwork259,
  "/sprites/x-ray.webp": artwork260,
  "/sprites/zero-point.webp": artwork261,
}

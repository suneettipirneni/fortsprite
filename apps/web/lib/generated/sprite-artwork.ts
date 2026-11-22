import type { StaticImageData } from "next/image"

import artwork0 from "../../assets/sprites/8-bit.webp"
import artwork1 from "../../assets/sprites/adventure.webp"
import artwork2 from "../../assets/sprites/air.webp"
import artwork3 from "../../assets/sprites/aura.webp"
import artwork4 from "../../assets/sprites/barry-ofish.webp"
import artwork5 from "../../assets/sprites/batman.webp"
import artwork6 from "../../assets/sprites/birthday.png"
import artwork7 from "../../assets/sprites/blinky.webp"
import artwork8 from "../../assets/sprites/boss.webp"
import artwork9 from "../../assets/sprites/bounty-hunter-8-bit.png"
import artwork10 from "../../assets/sprites/bounty-hunter-adventure.png"
import artwork11 from "../../assets/sprites/bounty-hunter-birthday.png"
import artwork12 from "../../assets/sprites/bounty-hunter-blinky.png"
import artwork13 from "../../assets/sprites/bounty-hunter-body-slam.png"
import artwork14 from "../../assets/sprites/bounty-hunter-bush.png"
import artwork15 from "../../assets/sprites/bounty-hunter-crown.webp"
import artwork16 from "../../assets/sprites/bounty-hunter-dumpster-dive.webp"
import artwork17 from "../../assets/sprites/bounty-hunter-honey.webp"
import artwork18 from "../../assets/sprites/bounty-hunter-jackrabbit.png"
import artwork19 from "../../assets/sprites/bounty-hunter-jonesy.png"
import artwork20 from "../../assets/sprites/bounty-hunter-killswitch.png"
import artwork21 from "../../assets/sprites/bounty-hunter-klombo.png"
import artwork22 from "../../assets/sprites/bounty-hunter-morgana.png"
import artwork23 from "../../assets/sprites/bounty-hunter-one-wish-willow.webp"
import artwork24 from "../../assets/sprites/bounty-hunter-onigiri.png"
import artwork25 from "../../assets/sprites/bounty-hunter-overshield.png"
import artwork26 from "../../assets/sprites/bounty-hunter-pond.png"
import artwork27 from "../../assets/sprites/bounty-hunter-shadow.png"
import artwork28 from "../../assets/sprites/bounty-hunter-sonic.png"
import artwork29 from "../../assets/sprites/bounty-hunter-spooky-dash.webp"
import artwork30 from "../../assets/sprites/bounty-hunter-storm-scout.png"
import artwork31 from "../../assets/sprites/bounty-hunter-tails.png"
import artwork32 from "../../assets/sprites/bounty-hunter-the-deer.webp"
import artwork33 from "../../assets/sprites/bounty-hunter-vampire.webp"
import artwork34 from "../../assets/sprites/bounty-hunter-x-ray.png"
import artwork35 from "../../assets/sprites/burnt-peanut.webp"
import artwork36 from "../../assets/sprites/bush.webp"
import artwork37 from "../../assets/sprites/cheat-master-8-bit.webp"
import artwork38 from "../../assets/sprites/cheat-master-adventure.webp"
import artwork39 from "../../assets/sprites/cheat-master-birthday.png"
import artwork40 from "../../assets/sprites/cheat-master-blinky.webp"
import artwork41 from "../../assets/sprites/cheat-master-bush.webp"
import artwork42 from "../../assets/sprites/cheat-master-crash-bandicoot.webp"
import artwork43 from "../../assets/sprites/cheat-master-crown.webp"
import artwork44 from "../../assets/sprites/cheat-master-dumpster-dive.webp"
import artwork45 from "../../assets/sprites/cheat-master-jackrabbit.webp"
import artwork46 from "../../assets/sprites/cheat-master-jonesy.webp"
import artwork47 from "../../assets/sprites/cheat-master-killswitch.webp"
import artwork48 from "../../assets/sprites/cheat-master-klombo.webp"
import artwork49 from "../../assets/sprites/cheat-master-morgana.png"
import artwork50 from "../../assets/sprites/cheat-master-onigiri.webp"
import artwork51 from "../../assets/sprites/cheat-master-overshield.webp"
import artwork52 from "../../assets/sprites/cheat-master-pond.webp"
import artwork53 from "../../assets/sprites/cheat-master-shadow.webp"
import artwork54 from "../../assets/sprites/cheat-master-sonic.webp"
import artwork55 from "../../assets/sprites/cheat-master-spooky-dash.webp"
import artwork56 from "../../assets/sprites/cheat-master-storm-scout.webp"
import artwork57 from "../../assets/sprites/cheat-master-tails.webp"
import artwork58 from "../../assets/sprites/cheat-master-the-deer.webp"
import artwork59 from "../../assets/sprites/cheat-master-vampire.webp"
import artwork60 from "../../assets/sprites/cheat-master-x-ray.webp"
import artwork61 from "../../assets/sprites/cheatmaster-honey.webp"
import artwork62 from "../../assets/sprites/cheatmaster-one-wish-willow.webp"
import artwork63 from "../../assets/sprites/chester.webp"
import artwork64 from "../../assets/sprites/crash-bandicoot.webp"
import artwork65 from "../../assets/sprites/crown.webp"
import artwork66 from "../../assets/sprites/cube-batman.webp"
import artwork67 from "../../assets/sprites/cube-boss.webp"
import artwork68 from "../../assets/sprites/cube-dream.webp"
import artwork69 from "../../assets/sprites/cube-earth.webp"
import artwork70 from "../../assets/sprites/cube-fire.webp"
import artwork71 from "../../assets/sprites/cube-fishy.webp"
import artwork72 from "../../assets/sprites/cube-grim.webp"
import artwork73 from "../../assets/sprites/cube-punk.webp"
import artwork74 from "../../assets/sprites/cube-zero-point.webp"
import artwork75 from "../../assets/sprites/cursed-barry-ofish.webp"
import artwork76 from "../../assets/sprites/cursed-chester.webp"
import artwork77 from "../../assets/sprites/cursed-exmarks.webp"
import artwork78 from "../../assets/sprites/cursed-halfpeeld.webp"
import artwork79 from "../../assets/sprites/cursed-kelper.webp"
import artwork80 from "../../assets/sprites/cursed-lil-flacko.webp"
import artwork81 from "../../assets/sprites/cursed-lil-squibbly.webp"
import artwork82 from "../../assets/sprites/cursed-lil-uzi-vert-jr.webp"
import artwork83 from "../../assets/sprites/cursed-mini-miku.webp"
import artwork84 from "../../assets/sprites/cursed-plundarrgh.webp"
import artwork85 from "../../assets/sprites/cursed-re-pete.webp"
import artwork86 from "../../assets/sprites/cursed-sir-oscar-the-second.webp"
import artwork87 from "../../assets/sprites/cursed-squiplash.webp"
import artwork88 from "../../assets/sprites/cursed-wayfinder.webp"
import artwork89 from "../../assets/sprites/demon.webp"
import artwork90 from "../../assets/sprites/dream.webp"
import artwork91 from "../../assets/sprites/duck.webp"
import artwork92 from "../../assets/sprites/dumpster-dive.webp"
import artwork93 from "../../assets/sprites/earth.webp"
import artwork94 from "../../assets/sprites/exmarks.webp"
import artwork95 from "../../assets/sprites/fire.webp"
import artwork96 from "../../assets/sprites/fishy.webp"
import artwork97 from "../../assets/sprites/fortune-barry-ofish.webp"
import artwork98 from "../../assets/sprites/fortune-chester.webp"
import artwork99 from "../../assets/sprites/fortune-exmarks.webp"
import artwork100 from "../../assets/sprites/fortune-halfpeeld.webp"
import artwork101 from "../../assets/sprites/fortune-kelper.webp"
import artwork102 from "../../assets/sprites/fortune-lil-flacko.webp"
import artwork103 from "../../assets/sprites/fortune-lil-squibbly.webp"
import artwork104 from "../../assets/sprites/fortune-lil-uzi-vert-jr.webp"
import artwork105 from "../../assets/sprites/fortune-mini-miku.webp"
import artwork106 from "../../assets/sprites/fortune-plundarrgh.webp"
import artwork107 from "../../assets/sprites/fortune-re-pete.webp"
import artwork108 from "../../assets/sprites/fortune-sir-oscar-the-second.webp"
import artwork109 from "../../assets/sprites/fortune-squiplash.webp"
import artwork110 from "../../assets/sprites/fortune-wayfinder.webp"
import artwork111 from "../../assets/sprites/galaxy-air.webp"
import artwork112 from "../../assets/sprites/galaxy-aura.webp"
import artwork113 from "../../assets/sprites/galaxy-batman.webp"
import artwork114 from "../../assets/sprites/galaxy-boss.webp"
import artwork115 from "../../assets/sprites/galaxy-demon.webp"
import artwork116 from "../../assets/sprites/galaxy-dream.webp"
import artwork117 from "../../assets/sprites/galaxy-duck.webp"
import artwork118 from "../../assets/sprites/galaxy-earth.webp"
import artwork119 from "../../assets/sprites/galaxy-fire.webp"
import artwork120 from "../../assets/sprites/galaxy-fishy.webp"
import artwork121 from "../../assets/sprites/galaxy-ghost.webp"
import artwork122 from "../../assets/sprites/galaxy-grim.webp"
import artwork123 from "../../assets/sprites/galaxy-king.webp"
import artwork124 from "../../assets/sprites/galaxy-llama.webp"
import artwork125 from "../../assets/sprites/galaxy-peely.webp"
import artwork126 from "../../assets/sprites/galaxy-punk.webp"
import artwork127 from "../../assets/sprites/galaxy-seven.webp"
import artwork128 from "../../assets/sprites/galaxy-striker.webp"
import artwork129 from "../../assets/sprites/galaxy-water.webp"
import artwork130 from "../../assets/sprites/galaxy-zero-point.webp"
import artwork131 from "../../assets/sprites/gem-aura.webp"
import artwork132 from "../../assets/sprites/gem-demon.webp"
import artwork133 from "../../assets/sprites/gem-duck.webp"
import artwork134 from "../../assets/sprites/gem-earth.webp"
import artwork135 from "../../assets/sprites/gem-grim.webp"
import artwork136 from "../../assets/sprites/gem-llama.webp"
import artwork137 from "../../assets/sprites/gem-water.webp"
import artwork138 from "../../assets/sprites/gem-zero-point.webp"
import artwork139 from "../../assets/sprites/ghost.webp"
import artwork140 from "../../assets/sprites/gold-8-bit.webp"
import artwork141 from "../../assets/sprites/gold-adventure.webp"
import artwork142 from "../../assets/sprites/gold-air.webp"
import artwork143 from "../../assets/sprites/gold-aura.webp"
import artwork144 from "../../assets/sprites/gold-barry-ofish.webp"
import artwork145 from "../../assets/sprites/gold-batman.webp"
import artwork146 from "../../assets/sprites/gold-birthday.png"
import artwork147 from "../../assets/sprites/gold-blinky.webp"
import artwork148 from "../../assets/sprites/gold-boss.webp"
import artwork149 from "../../assets/sprites/gold-bush.webp"
import artwork150 from "../../assets/sprites/gold-chester.webp"
import artwork151 from "../../assets/sprites/gold-crash-bandicoot.webp"
import artwork152 from "../../assets/sprites/gold-crown.webp"
import artwork153 from "../../assets/sprites/gold-demon.webp"
import artwork154 from "../../assets/sprites/gold-dream.webp"
import artwork155 from "../../assets/sprites/gold-duck.webp"
import artwork156 from "../../assets/sprites/gold-dumpster-dive.webp"
import artwork157 from "../../assets/sprites/gold-earth.webp"
import artwork158 from "../../assets/sprites/gold-exmarks.webp"
import artwork159 from "../../assets/sprites/gold-fire.webp"
import artwork160 from "../../assets/sprites/gold-fishy.webp"
import artwork161 from "../../assets/sprites/gold-ghost.webp"
import artwork162 from "../../assets/sprites/gold-grim.webp"
import artwork163 from "../../assets/sprites/gold-halfpeeld.webp"
import artwork164 from "../../assets/sprites/gold-honey.webp"
import artwork165 from "../../assets/sprites/gold-jackrabbit.webp"
import artwork166 from "../../assets/sprites/gold-jonesy.webp"
import artwork167 from "../../assets/sprites/gold-kelper.webp"
import artwork168 from "../../assets/sprites/gold-killswitch.webp"
import artwork169 from "../../assets/sprites/gold-king.webp"
import artwork170 from "../../assets/sprites/gold-klombo.webp"
import artwork171 from "../../assets/sprites/gold-lil-flacko.webp"
import artwork172 from "../../assets/sprites/gold-lil-squibbly.webp"
import artwork173 from "../../assets/sprites/gold-lil-uzi-vert-jr.webp"
import artwork174 from "../../assets/sprites/gold-llama.webp"
import artwork175 from "../../assets/sprites/gold-mini-miku.webp"
import artwork176 from "../../assets/sprites/gold-morgana.png"
import artwork177 from "../../assets/sprites/gold-one-wish-willow.webp"
import artwork178 from "../../assets/sprites/gold-onigiri.webp"
import artwork179 from "../../assets/sprites/gold-overshield.webp"
import artwork180 from "../../assets/sprites/gold-peely.webp"
import artwork181 from "../../assets/sprites/gold-plundarrgh.webp"
import artwork182 from "../../assets/sprites/gold-pond.webp"
import artwork183 from "../../assets/sprites/gold-punk.webp"
import artwork184 from "../../assets/sprites/gold-re-pete.webp"
import artwork185 from "../../assets/sprites/gold-seven.webp"
import artwork186 from "../../assets/sprites/gold-shadow.webp"
import artwork187 from "../../assets/sprites/gold-sir-oscar-the-second.webp"
import artwork188 from "../../assets/sprites/gold-sonic.webp"
import artwork189 from "../../assets/sprites/gold-spooky-dash.webp"
import artwork190 from "../../assets/sprites/gold-squiplash.webp"
import artwork191 from "../../assets/sprites/gold-storm-scout.webp"
import artwork192 from "../../assets/sprites/gold-striker.webp"
import artwork193 from "../../assets/sprites/gold-tails.webp"
import artwork194 from "../../assets/sprites/gold-the-deer.webp"
import artwork195 from "../../assets/sprites/gold-vampire.webp"
import artwork196 from "../../assets/sprites/gold-water.webp"
import artwork197 from "../../assets/sprites/gold-wayfinder.webp"
import artwork198 from "../../assets/sprites/gold-x-ray.webp"
import artwork199 from "../../assets/sprites/gold-zero-point.webp"
import artwork200 from "../../assets/sprites/grim.webp"
import artwork201 from "../../assets/sprites/gummy-air.webp"
import artwork202 from "../../assets/sprites/gummy-aura.webp"
import artwork203 from "../../assets/sprites/gummy-batman.webp"
import artwork204 from "../../assets/sprites/gummy-boss.webp"
import artwork205 from "../../assets/sprites/gummy-demon.webp"
import artwork206 from "../../assets/sprites/gummy-dream.webp"
import artwork207 from "../../assets/sprites/gummy-duck.webp"
import artwork208 from "../../assets/sprites/gummy-earth.webp"
import artwork209 from "../../assets/sprites/gummy-fire.webp"
import artwork210 from "../../assets/sprites/gummy-fishy.webp"
import artwork211 from "../../assets/sprites/gummy-ghost.webp"
import artwork212 from "../../assets/sprites/gummy-grim.webp"
import artwork213 from "../../assets/sprites/gummy-king.webp"
import artwork214 from "../../assets/sprites/gummy-llama.webp"
import artwork215 from "../../assets/sprites/gummy-peely.webp"
import artwork216 from "../../assets/sprites/gummy-punk.webp"
import artwork217 from "../../assets/sprites/gummy-seven.webp"
import artwork218 from "../../assets/sprites/gummy-striker.webp"
import artwork219 from "../../assets/sprites/gummy-water.webp"
import artwork220 from "../../assets/sprites/gummy-zero-point.webp"
import artwork221 from "../../assets/sprites/halfpeeld.webp"
import artwork222 from "../../assets/sprites/holofoil-air.webp"
import artwork223 from "../../assets/sprites/holofoil-batman.webp"
import artwork224 from "../../assets/sprites/holofoil-fire.webp"
import artwork225 from "../../assets/sprites/holofoil-ghost.webp"
import artwork226 from "../../assets/sprites/holofoil-grim.webp"
import artwork227 from "../../assets/sprites/holofoil-king.webp"
import artwork228 from "../../assets/sprites/holofoil-peely.webp"
import artwork229 from "../../assets/sprites/holofoil-seven.webp"
import artwork230 from "../../assets/sprites/holofoil-striker.webp"
import artwork231 from "../../assets/sprites/holofoil-water.webp"
import artwork232 from "../../assets/sprites/holofoil-zero-point.webp"
import artwork233 from "../../assets/sprites/honey.webp"
import artwork234 from "../../assets/sprites/ironmouse.webp"
import artwork235 from "../../assets/sprites/jackrabbit.webp"
import artwork236 from "../../assets/sprites/john-wick.webp"
import artwork237 from "../../assets/sprites/jonesy.webp"
import artwork238 from "../../assets/sprites/kelper.webp"
import artwork239 from "../../assets/sprites/killswitch.webp"
import artwork240 from "../../assets/sprites/king.webp"
import artwork241 from "../../assets/sprites/klombo.webp"
import artwork242 from "../../assets/sprites/lil-flacko.webp"
import artwork243 from "../../assets/sprites/lil-squibbly.webp"
import artwork244 from "../../assets/sprites/lil-uzi-vert-jr.webp"
import artwork245 from "../../assets/sprites/llama.webp"
import artwork246 from "../../assets/sprites/loot-hacker-8-bit.webp"
import artwork247 from "../../assets/sprites/loot-hacker-adventure.webp"
import artwork248 from "../../assets/sprites/loot-hacker-birthday.png"
import artwork249 from "../../assets/sprites/loot-hacker-blinky.webp"
import artwork250 from "../../assets/sprites/loot-hacker-bushranger.webp"
import artwork251 from "../../assets/sprites/loot-hacker-crash-bandicoot.webp"
import artwork252 from "../../assets/sprites/loot-hacker-crown.webp"
import artwork253 from "../../assets/sprites/loot-hacker-dumpster-dive.webp"
import artwork254 from "../../assets/sprites/loot-hacker-honey.webp"
import artwork255 from "../../assets/sprites/loot-hacker-jackrabbit.webp"
import artwork256 from "../../assets/sprites/loot-hacker-jonesy.webp"
import artwork257 from "../../assets/sprites/loot-hacker-killswitch.webp"
import artwork258 from "../../assets/sprites/loot-hacker-klombo.webp"
import artwork259 from "../../assets/sprites/loot-hacker-morgana.png"
import artwork260 from "../../assets/sprites/loot-hacker-one-wish-willow.webp"
import artwork261 from "../../assets/sprites/loot-hacker-onigiri.webp"
import artwork262 from "../../assets/sprites/loot-hacker-overshield.webp"
import artwork263 from "../../assets/sprites/loot-hacker-pond.webp"
import artwork264 from "../../assets/sprites/loot-hacker-shadow.webp"
import artwork265 from "../../assets/sprites/loot-hacker-sonic.webp"
import artwork266 from "../../assets/sprites/loot-hacker-spooky-dash.webp"
import artwork267 from "../../assets/sprites/loot-hacker-storm-scout.webp"
import artwork268 from "../../assets/sprites/loot-hacker-tails.webp"
import artwork269 from "../../assets/sprites/loot-hacker-the-deer.webp"
import artwork270 from "../../assets/sprites/loot-hacker-vampire.webp"
import artwork271 from "../../assets/sprites/loot-hacker-x-ray.webp"
import artwork272 from "../../assets/sprites/mega-man.webp"
import artwork273 from "../../assets/sprites/mini-miku.png"
import artwork274 from "../../assets/sprites/morgana.png"
import artwork275 from "../../assets/sprites/one-wish-willow.webp"
import artwork276 from "../../assets/sprites/onigiri.webp"
import artwork277 from "../../assets/sprites/overshield.webp"
import artwork278 from "../../assets/sprites/peely.webp"
import artwork279 from "../../assets/sprites/plundarrgh.webp"
import artwork280 from "../../assets/sprites/pollo.webp"
import artwork281 from "../../assets/sprites/pond.webp"
import artwork282 from "../../assets/sprites/punk.webp"
import artwork283 from "../../assets/sprites/quack-adventure.webp"
import artwork284 from "../../assets/sprites/quack-bush.webp"
import artwork285 from "../../assets/sprites/quack-earth.webp"
import artwork286 from "../../assets/sprites/quack-fire.webp"
import artwork287 from "../../assets/sprites/quack-jonesy.webp"
import artwork288 from "../../assets/sprites/quack-klombo.webp"
import artwork289 from "../../assets/sprites/quack-spooky-dash.webp"
import artwork290 from "../../assets/sprites/quack-water.webp"
import artwork291 from "../../assets/sprites/quack-zero-point.webp"
import artwork292 from "../../assets/sprites/re-pete.webp"
import artwork293 from "../../assets/sprites/seven.webp"
import artwork294 from "../../assets/sprites/shadow.webp"
import artwork295 from "../../assets/sprites/sir-oscar-the-second.webp"
import artwork296 from "../../assets/sprites/sonic.webp"
import artwork297 from "../../assets/sprites/spooky-dash.webp"
import artwork298 from "../../assets/sprites/squiplash.webp"
import artwork299 from "../../assets/sprites/storm-scout.webp"
import artwork300 from "../../assets/sprites/striker.webp"
import artwork301 from "../../assets/sprites/sweet-dreams.webp"
import artwork302 from "../../assets/sprites/tails.webp"
import artwork303 from "../../assets/sprites/the-deer.webp"
import artwork304 from "../../assets/sprites/transponder-snail.webp"
import artwork305 from "../../assets/sprites/trick-or-treat-8-bit.webp"
import artwork306 from "../../assets/sprites/trick-or-treat-adventure.webp"
import artwork307 from "../../assets/sprites/trick-or-treat-birthday.webp"
import artwork308 from "../../assets/sprites/trick-or-treat-blinky.webp"
import artwork309 from "../../assets/sprites/trick-or-treat-bush.webp"
import artwork310 from "../../assets/sprites/trick-or-treat-crash-bandicoot.webp"
import artwork311 from "../../assets/sprites/trick-or-treat-crown.webp"
import artwork312 from "../../assets/sprites/trick-or-treat-dumpster-dive.webp"
import artwork313 from "../../assets/sprites/trick-or-treat-honey.webp"
import artwork314 from "../../assets/sprites/trick-or-treat-jackrabbit.webp"
import artwork315 from "../../assets/sprites/trick-or-treat-jonesy.webp"
import artwork316 from "../../assets/sprites/trick-or-treat-killswitch.webp"
import artwork317 from "../../assets/sprites/trick-or-treat-klombo.webp"
import artwork318 from "../../assets/sprites/trick-or-treat-morgana.webp"
import artwork319 from "../../assets/sprites/trick-or-treat-one-wish-willow.webp"
import artwork320 from "../../assets/sprites/trick-or-treat-onigiri.webp"
import artwork321 from "../../assets/sprites/trick-or-treat-overshield.webp"
import artwork322 from "../../assets/sprites/trick-or-treat-pond.webp"
import artwork323 from "../../assets/sprites/trick-or-treat-shadow.webp"
import artwork324 from "../../assets/sprites/trick-or-treat-sonic.webp"
import artwork325 from "../../assets/sprites/trick-or-treat-spooky-dash.webp"
import artwork326 from "../../assets/sprites/trick-or-treat-storm-scout.webp"
import artwork327 from "../../assets/sprites/trick-or-treat-tails.webp"
import artwork328 from "../../assets/sprites/trick-or-treat-the-deer.webp"
import artwork329 from "../../assets/sprites/trick-or-treat-vampire.webp"
import artwork330 from "../../assets/sprites/trick-or-treat-x-ray.webp"
import artwork331 from "../../assets/sprites/vampire.webp"
import artwork332 from "../../assets/sprites/vini-jr.webp"
import artwork333 from "../../assets/sprites/water.webp"
import artwork334 from "../../assets/sprites/wayfinder.webp"
import artwork335 from "../../assets/sprites/x-ray.webp"
import artwork336 from "../../assets/sprites/zee.webp"
import artwork337 from "../../assets/sprites/zero-point.webp"

export const spriteArtwork: Record<string, StaticImageData> = {
  "/sprites/8-bit.webp": artwork0,
  "/sprites/adventure.webp": artwork1,
  "/sprites/air.webp": artwork2,
  "/sprites/aura.webp": artwork3,
  "/sprites/barry-ofish.webp": artwork4,
  "/sprites/batman.webp": artwork5,
  "/sprites/birthday.png": artwork6,
  "/sprites/blinky.webp": artwork7,
  "/sprites/boss.webp": artwork8,
  "/sprites/bounty-hunter-8-bit.png": artwork9,
  "/sprites/bounty-hunter-adventure.png": artwork10,
  "/sprites/bounty-hunter-birthday.png": artwork11,
  "/sprites/bounty-hunter-blinky.png": artwork12,
  "/sprites/bounty-hunter-body-slam.png": artwork13,
  "/sprites/bounty-hunter-bush.png": artwork14,
  "/sprites/bounty-hunter-crown.webp": artwork15,
  "/sprites/bounty-hunter-dumpster-dive.webp": artwork16,
  "/sprites/bounty-hunter-honey.webp": artwork17,
  "/sprites/bounty-hunter-jackrabbit.png": artwork18,
  "/sprites/bounty-hunter-jonesy.png": artwork19,
  "/sprites/bounty-hunter-killswitch.png": artwork20,
  "/sprites/bounty-hunter-klombo.png": artwork21,
  "/sprites/bounty-hunter-morgana.png": artwork22,
  "/sprites/bounty-hunter-one-wish-willow.webp": artwork23,
  "/sprites/bounty-hunter-onigiri.png": artwork24,
  "/sprites/bounty-hunter-overshield.png": artwork25,
  "/sprites/bounty-hunter-pond.png": artwork26,
  "/sprites/bounty-hunter-shadow.png": artwork27,
  "/sprites/bounty-hunter-sonic.png": artwork28,
  "/sprites/bounty-hunter-spooky-dash.webp": artwork29,
  "/sprites/bounty-hunter-storm-scout.png": artwork30,
  "/sprites/bounty-hunter-tails.png": artwork31,
  "/sprites/bounty-hunter-the-deer.webp": artwork32,
  "/sprites/bounty-hunter-vampire.webp": artwork33,
  "/sprites/bounty-hunter-x-ray.png": artwork34,
  "/sprites/burnt-peanut.webp": artwork35,
  "/sprites/bush.webp": artwork36,
  "/sprites/cheat-master-8-bit.webp": artwork37,
  "/sprites/cheat-master-adventure.webp": artwork38,
  "/sprites/cheat-master-birthday.png": artwork39,
  "/sprites/cheat-master-blinky.webp": artwork40,
  "/sprites/cheat-master-bush.webp": artwork41,
  "/sprites/cheat-master-crash-bandicoot.webp": artwork42,
  "/sprites/cheat-master-crown.webp": artwork43,
  "/sprites/cheat-master-dumpster-dive.webp": artwork44,
  "/sprites/cheat-master-jackrabbit.webp": artwork45,
  "/sprites/cheat-master-jonesy.webp": artwork46,
  "/sprites/cheat-master-killswitch.webp": artwork47,
  "/sprites/cheat-master-klombo.webp": artwork48,
  "/sprites/cheat-master-morgana.png": artwork49,
  "/sprites/cheat-master-onigiri.webp": artwork50,
  "/sprites/cheat-master-overshield.webp": artwork51,
  "/sprites/cheat-master-pond.webp": artwork52,
  "/sprites/cheat-master-shadow.webp": artwork53,
  "/sprites/cheat-master-sonic.webp": artwork54,
  "/sprites/cheat-master-spooky-dash.webp": artwork55,
  "/sprites/cheat-master-storm-scout.webp": artwork56,
  "/sprites/cheat-master-tails.webp": artwork57,
  "/sprites/cheat-master-the-deer.webp": artwork58,
  "/sprites/cheat-master-vampire.webp": artwork59,
  "/sprites/cheat-master-x-ray.webp": artwork60,
  "/sprites/cheatmaster-honey.webp": artwork61,
  "/sprites/cheatmaster-one-wish-willow.webp": artwork62,
  "/sprites/chester.webp": artwork63,
  "/sprites/crash-bandicoot.webp": artwork64,
  "/sprites/crown.webp": artwork65,
  "/sprites/cube-batman.webp": artwork66,
  "/sprites/cube-boss.webp": artwork67,
  "/sprites/cube-dream.webp": artwork68,
  "/sprites/cube-earth.webp": artwork69,
  "/sprites/cube-fire.webp": artwork70,
  "/sprites/cube-fishy.webp": artwork71,
  "/sprites/cube-grim.webp": artwork72,
  "/sprites/cube-punk.webp": artwork73,
  "/sprites/cube-zero-point.webp": artwork74,
  "/sprites/cursed-barry-ofish.webp": artwork75,
  "/sprites/cursed-chester.webp": artwork76,
  "/sprites/cursed-exmarks.webp": artwork77,
  "/sprites/cursed-halfpeeld.webp": artwork78,
  "/sprites/cursed-kelper.webp": artwork79,
  "/sprites/cursed-lil-flacko.webp": artwork80,
  "/sprites/cursed-lil-squibbly.webp": artwork81,
  "/sprites/cursed-lil-uzi-vert-jr.webp": artwork82,
  "/sprites/cursed-mini-miku.webp": artwork83,
  "/sprites/cursed-plundarrgh.webp": artwork84,
  "/sprites/cursed-re-pete.webp": artwork85,
  "/sprites/cursed-sir-oscar-the-second.webp": artwork86,
  "/sprites/cursed-squiplash.webp": artwork87,
  "/sprites/cursed-wayfinder.webp": artwork88,
  "/sprites/demon.webp": artwork89,
  "/sprites/dream.webp": artwork90,
  "/sprites/duck.webp": artwork91,
  "/sprites/dumpster-dive.webp": artwork92,
  "/sprites/earth.webp": artwork93,
  "/sprites/exmarks.webp": artwork94,
  "/sprites/fire.webp": artwork95,
  "/sprites/fishy.webp": artwork96,
  "/sprites/fortune-barry-ofish.webp": artwork97,
  "/sprites/fortune-chester.webp": artwork98,
  "/sprites/fortune-exmarks.webp": artwork99,
  "/sprites/fortune-halfpeeld.webp": artwork100,
  "/sprites/fortune-kelper.webp": artwork101,
  "/sprites/fortune-lil-flacko.webp": artwork102,
  "/sprites/fortune-lil-squibbly.webp": artwork103,
  "/sprites/fortune-lil-uzi-vert-jr.webp": artwork104,
  "/sprites/fortune-mini-miku.webp": artwork105,
  "/sprites/fortune-plundarrgh.webp": artwork106,
  "/sprites/fortune-re-pete.webp": artwork107,
  "/sprites/fortune-sir-oscar-the-second.webp": artwork108,
  "/sprites/fortune-squiplash.webp": artwork109,
  "/sprites/fortune-wayfinder.webp": artwork110,
  "/sprites/galaxy-air.webp": artwork111,
  "/sprites/galaxy-aura.webp": artwork112,
  "/sprites/galaxy-batman.webp": artwork113,
  "/sprites/galaxy-boss.webp": artwork114,
  "/sprites/galaxy-demon.webp": artwork115,
  "/sprites/galaxy-dream.webp": artwork116,
  "/sprites/galaxy-duck.webp": artwork117,
  "/sprites/galaxy-earth.webp": artwork118,
  "/sprites/galaxy-fire.webp": artwork119,
  "/sprites/galaxy-fishy.webp": artwork120,
  "/sprites/galaxy-ghost.webp": artwork121,
  "/sprites/galaxy-grim.webp": artwork122,
  "/sprites/galaxy-king.webp": artwork123,
  "/sprites/galaxy-llama.webp": artwork124,
  "/sprites/galaxy-peely.webp": artwork125,
  "/sprites/galaxy-punk.webp": artwork126,
  "/sprites/galaxy-seven.webp": artwork127,
  "/sprites/galaxy-striker.webp": artwork128,
  "/sprites/galaxy-water.webp": artwork129,
  "/sprites/galaxy-zero-point.webp": artwork130,
  "/sprites/gem-aura.webp": artwork131,
  "/sprites/gem-demon.webp": artwork132,
  "/sprites/gem-duck.webp": artwork133,
  "/sprites/gem-earth.webp": artwork134,
  "/sprites/gem-grim.webp": artwork135,
  "/sprites/gem-llama.webp": artwork136,
  "/sprites/gem-water.webp": artwork137,
  "/sprites/gem-zero-point.webp": artwork138,
  "/sprites/ghost.webp": artwork139,
  "/sprites/gold-8-bit.webp": artwork140,
  "/sprites/gold-adventure.webp": artwork141,
  "/sprites/gold-air.webp": artwork142,
  "/sprites/gold-aura.webp": artwork143,
  "/sprites/gold-barry-ofish.webp": artwork144,
  "/sprites/gold-batman.webp": artwork145,
  "/sprites/gold-birthday.png": artwork146,
  "/sprites/gold-blinky.webp": artwork147,
  "/sprites/gold-boss.webp": artwork148,
  "/sprites/gold-bush.webp": artwork149,
  "/sprites/gold-chester.webp": artwork150,
  "/sprites/gold-crash-bandicoot.webp": artwork151,
  "/sprites/gold-crown.webp": artwork152,
  "/sprites/gold-demon.webp": artwork153,
  "/sprites/gold-dream.webp": artwork154,
  "/sprites/gold-duck.webp": artwork155,
  "/sprites/gold-dumpster-dive.webp": artwork156,
  "/sprites/gold-earth.webp": artwork157,
  "/sprites/gold-exmarks.webp": artwork158,
  "/sprites/gold-fire.webp": artwork159,
  "/sprites/gold-fishy.webp": artwork160,
  "/sprites/gold-ghost.webp": artwork161,
  "/sprites/gold-grim.webp": artwork162,
  "/sprites/gold-halfpeeld.webp": artwork163,
  "/sprites/gold-honey.webp": artwork164,
  "/sprites/gold-jackrabbit.webp": artwork165,
  "/sprites/gold-jonesy.webp": artwork166,
  "/sprites/gold-kelper.webp": artwork167,
  "/sprites/gold-killswitch.webp": artwork168,
  "/sprites/gold-king.webp": artwork169,
  "/sprites/gold-klombo.webp": artwork170,
  "/sprites/gold-lil-flacko.webp": artwork171,
  "/sprites/gold-lil-squibbly.webp": artwork172,
  "/sprites/gold-lil-uzi-vert-jr.webp": artwork173,
  "/sprites/gold-llama.webp": artwork174,
  "/sprites/gold-mini-miku.webp": artwork175,
  "/sprites/gold-morgana.png": artwork176,
  "/sprites/gold-one-wish-willow.webp": artwork177,
  "/sprites/gold-onigiri.webp": artwork178,
  "/sprites/gold-overshield.webp": artwork179,
  "/sprites/gold-peely.webp": artwork180,
  "/sprites/gold-plundarrgh.webp": artwork181,
  "/sprites/gold-pond.webp": artwork182,
  "/sprites/gold-punk.webp": artwork183,
  "/sprites/gold-re-pete.webp": artwork184,
  "/sprites/gold-seven.webp": artwork185,
  "/sprites/gold-shadow.webp": artwork186,
  "/sprites/gold-sir-oscar-the-second.webp": artwork187,
  "/sprites/gold-sonic.webp": artwork188,
  "/sprites/gold-spooky-dash.webp": artwork189,
  "/sprites/gold-squiplash.webp": artwork190,
  "/sprites/gold-storm-scout.webp": artwork191,
  "/sprites/gold-striker.webp": artwork192,
  "/sprites/gold-tails.webp": artwork193,
  "/sprites/gold-the-deer.webp": artwork194,
  "/sprites/gold-vampire.webp": artwork195,
  "/sprites/gold-water.webp": artwork196,
  "/sprites/gold-wayfinder.webp": artwork197,
  "/sprites/gold-x-ray.webp": artwork198,
  "/sprites/gold-zero-point.webp": artwork199,
  "/sprites/grim.webp": artwork200,
  "/sprites/gummy-air.webp": artwork201,
  "/sprites/gummy-aura.webp": artwork202,
  "/sprites/gummy-batman.webp": artwork203,
  "/sprites/gummy-boss.webp": artwork204,
  "/sprites/gummy-demon.webp": artwork205,
  "/sprites/gummy-dream.webp": artwork206,
  "/sprites/gummy-duck.webp": artwork207,
  "/sprites/gummy-earth.webp": artwork208,
  "/sprites/gummy-fire.webp": artwork209,
  "/sprites/gummy-fishy.webp": artwork210,
  "/sprites/gummy-ghost.webp": artwork211,
  "/sprites/gummy-grim.webp": artwork212,
  "/sprites/gummy-king.webp": artwork213,
  "/sprites/gummy-llama.webp": artwork214,
  "/sprites/gummy-peely.webp": artwork215,
  "/sprites/gummy-punk.webp": artwork216,
  "/sprites/gummy-seven.webp": artwork217,
  "/sprites/gummy-striker.webp": artwork218,
  "/sprites/gummy-water.webp": artwork219,
  "/sprites/gummy-zero-point.webp": artwork220,
  "/sprites/halfpeeld.webp": artwork221,
  "/sprites/holofoil-air.webp": artwork222,
  "/sprites/holofoil-batman.webp": artwork223,
  "/sprites/holofoil-fire.webp": artwork224,
  "/sprites/holofoil-ghost.webp": artwork225,
  "/sprites/holofoil-grim.webp": artwork226,
  "/sprites/holofoil-king.webp": artwork227,
  "/sprites/holofoil-peely.webp": artwork228,
  "/sprites/holofoil-seven.webp": artwork229,
  "/sprites/holofoil-striker.webp": artwork230,
  "/sprites/holofoil-water.webp": artwork231,
  "/sprites/holofoil-zero-point.webp": artwork232,
  "/sprites/honey.webp": artwork233,
  "/sprites/ironmouse.webp": artwork234,
  "/sprites/jackrabbit.webp": artwork235,
  "/sprites/john-wick.webp": artwork236,
  "/sprites/jonesy.webp": artwork237,
  "/sprites/kelper.webp": artwork238,
  "/sprites/killswitch.webp": artwork239,
  "/sprites/king.webp": artwork240,
  "/sprites/klombo.webp": artwork241,
  "/sprites/lil-flacko.webp": artwork242,
  "/sprites/lil-squibbly.webp": artwork243,
  "/sprites/lil-uzi-vert-jr.webp": artwork244,
  "/sprites/llama.webp": artwork245,
  "/sprites/loot-hacker-8-bit.webp": artwork246,
  "/sprites/loot-hacker-adventure.webp": artwork247,
  "/sprites/loot-hacker-birthday.png": artwork248,
  "/sprites/loot-hacker-blinky.webp": artwork249,
  "/sprites/loot-hacker-bushranger.webp": artwork250,
  "/sprites/loot-hacker-crash-bandicoot.webp": artwork251,
  "/sprites/loot-hacker-crown.webp": artwork252,
  "/sprites/loot-hacker-dumpster-dive.webp": artwork253,
  "/sprites/loot-hacker-honey.webp": artwork254,
  "/sprites/loot-hacker-jackrabbit.webp": artwork255,
  "/sprites/loot-hacker-jonesy.webp": artwork256,
  "/sprites/loot-hacker-killswitch.webp": artwork257,
  "/sprites/loot-hacker-klombo.webp": artwork258,
  "/sprites/loot-hacker-morgana.png": artwork259,
  "/sprites/loot-hacker-one-wish-willow.webp": artwork260,
  "/sprites/loot-hacker-onigiri.webp": artwork261,
  "/sprites/loot-hacker-overshield.webp": artwork262,
  "/sprites/loot-hacker-pond.webp": artwork263,
  "/sprites/loot-hacker-shadow.webp": artwork264,
  "/sprites/loot-hacker-sonic.webp": artwork265,
  "/sprites/loot-hacker-spooky-dash.webp": artwork266,
  "/sprites/loot-hacker-storm-scout.webp": artwork267,
  "/sprites/loot-hacker-tails.webp": artwork268,
  "/sprites/loot-hacker-the-deer.webp": artwork269,
  "/sprites/loot-hacker-vampire.webp": artwork270,
  "/sprites/loot-hacker-x-ray.webp": artwork271,
  "/sprites/mega-man.webp": artwork272,
  "/sprites/mini-miku.png": artwork273,
  "/sprites/morgana.png": artwork274,
  "/sprites/one-wish-willow.webp": artwork275,
  "/sprites/onigiri.webp": artwork276,
  "/sprites/overshield.webp": artwork277,
  "/sprites/peely.webp": artwork278,
  "/sprites/plundarrgh.webp": artwork279,
  "/sprites/pollo.webp": artwork280,
  "/sprites/pond.webp": artwork281,
  "/sprites/punk.webp": artwork282,
  "/sprites/quack-adventure.webp": artwork283,
  "/sprites/quack-bush.webp": artwork284,
  "/sprites/quack-earth.webp": artwork285,
  "/sprites/quack-fire.webp": artwork286,
  "/sprites/quack-jonesy.webp": artwork287,
  "/sprites/quack-klombo.webp": artwork288,
  "/sprites/quack-spooky-dash.webp": artwork289,
  "/sprites/quack-water.webp": artwork290,
  "/sprites/quack-zero-point.webp": artwork291,
  "/sprites/re-pete.webp": artwork292,
  "/sprites/seven.webp": artwork293,
  "/sprites/shadow.webp": artwork294,
  "/sprites/sir-oscar-the-second.webp": artwork295,
  "/sprites/sonic.webp": artwork296,
  "/sprites/spooky-dash.webp": artwork297,
  "/sprites/squiplash.webp": artwork298,
  "/sprites/storm-scout.webp": artwork299,
  "/sprites/striker.webp": artwork300,
  "/sprites/sweet-dreams.webp": artwork301,
  "/sprites/tails.webp": artwork302,
  "/sprites/the-deer.webp": artwork303,
  "/sprites/transponder-snail.webp": artwork304,
  "/sprites/trick-or-treat-8-bit.webp": artwork305,
  "/sprites/trick-or-treat-adventure.webp": artwork306,
  "/sprites/trick-or-treat-birthday.webp": artwork307,
  "/sprites/trick-or-treat-blinky.webp": artwork308,
  "/sprites/trick-or-treat-bush.webp": artwork309,
  "/sprites/trick-or-treat-crash-bandicoot.webp": artwork310,
  "/sprites/trick-or-treat-crown.webp": artwork311,
  "/sprites/trick-or-treat-dumpster-dive.webp": artwork312,
  "/sprites/trick-or-treat-honey.webp": artwork313,
  "/sprites/trick-or-treat-jackrabbit.webp": artwork314,
  "/sprites/trick-or-treat-jonesy.webp": artwork315,
  "/sprites/trick-or-treat-killswitch.webp": artwork316,
  "/sprites/trick-or-treat-klombo.webp": artwork317,
  "/sprites/trick-or-treat-morgana.webp": artwork318,
  "/sprites/trick-or-treat-one-wish-willow.webp": artwork319,
  "/sprites/trick-or-treat-onigiri.webp": artwork320,
  "/sprites/trick-or-treat-overshield.webp": artwork321,
  "/sprites/trick-or-treat-pond.webp": artwork322,
  "/sprites/trick-or-treat-shadow.webp": artwork323,
  "/sprites/trick-or-treat-sonic.webp": artwork324,
  "/sprites/trick-or-treat-spooky-dash.webp": artwork325,
  "/sprites/trick-or-treat-storm-scout.webp": artwork326,
  "/sprites/trick-or-treat-tails.webp": artwork327,
  "/sprites/trick-or-treat-the-deer.webp": artwork328,
  "/sprites/trick-or-treat-vampire.webp": artwork329,
  "/sprites/trick-or-treat-x-ray.webp": artwork330,
  "/sprites/vampire.webp": artwork331,
  "/sprites/vini-jr.webp": artwork332,
  "/sprites/water.webp": artwork333,
  "/sprites/wayfinder.webp": artwork334,
  "/sprites/x-ray.webp": artwork335,
  "/sprites/zee.webp": artwork336,
  "/sprites/zero-point.webp": artwork337,
}

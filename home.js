// Decorative memory blocks on the front page
const blocksBox = document.getElementById("blocks");
for (let i = 0; i < 48; i++) {
  const s = document.createElement("span");
  if (Math.random() < 0.5) s.className = "used";
  blocksBox.appendChild(s);
}
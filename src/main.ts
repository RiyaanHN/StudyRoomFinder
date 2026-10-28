import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { formatMinutes, getAllStatuses, toMinutes } from "./rooms";
import type { Dataset } from "./types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Approximate centre of the University of Guelph campus. Change for your own campus.
const CAMPUS_CENTER: L.LatLngTuple = [43.5328, -80.2265];

const daySelect = document.querySelector<HTMLSelectElement>("#day")!;
const timeInput = document.querySelector<HTMLInputElement>("#time")!;
const capacityInput = document.querySelector<HTMLInputElement>("#capacity")!;
const nowButton = document.querySelector<HTMLButtonElement>("#now")!;
const summary = document.querySelector<HTMLParagraphElement>("#summary")!;
const list = document.querySelector<HTMLUListElement>("#list")!;

DAYS.forEach((name, i) => daySelect.add(new Option(name, String(i))));

const map = L.map("map").setView(CAMPUS_CENTER, 16);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);
const markers = L.layerGroup().addTo(map);

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function setToNow(): void {
  const now = new Date();
  daySelect.value = String(now.getDay());
  timeInput.value = formatMinutes(now.getHours() * 60 + now.getMinutes());
}

function render(data: Dataset): void {
  const day = Number(daySelect.value);
  const minute = timeInput.value ? toMinutes(timeInput.value) : 0;
  const minCapacity = Math.max(1, Number(capacityInput.value) || 1);
  const statuses = getAllStatuses(data, day, minute, minCapacity);

  markers.clearLayers();
  list.replaceChildren();

  const freeCount = statuses.filter((s) => s.free).length;
  summary.textContent = `${freeCount} of ${statuses.length} rooms free`;

  for (const s of statuses) {
    const detail = s.free
      ? s.changesAt === null
        ? "Free for the rest of the day"
        : `Free until ${formatMinutes(s.changesAt)}`
      : `Busy until ${s.changesAt === null ? "later" : formatMinutes(s.changesAt)}`;

    const li = document.createElement("li");
    li.className = s.free ? "free" : "busy";
    li.innerHTML = `<strong>${escapeHtml(s.room.building)} ${escapeHtml(s.room.name)}</strong>
      <span>${detail} · seats ${s.room.capacity}</span>`;
    li.addEventListener("click", () => map.flyTo([s.room.lat, s.room.lng], 18));
    list.append(li);

    L.circleMarker([s.room.lat, s.room.lng], {
      radius: 9,
      color: s.free ? "#1a7f37" : "#8c959f",
      fillColor: s.free ? "#2da44e" : "#afb8c1",
      fillOpacity: 0.85,
    })
      .bindPopup(`<strong>${escapeHtml(s.room.building)} ${escapeHtml(s.room.name)}</strong><br>${detail}`)
      .addTo(markers);
  }
}

async function main(): Promise<void> {
  setToNow();
  const res = await fetch(`${import.meta.env.BASE_URL}data/schedule.json`);
  if (!res.ok) {
    summary.textContent = "Could not load schedule data.";
    return;
  }
  const data = (await res.json()) as Dataset;

  const rerender = () => render(data);
  [daySelect, timeInput, capacityInput].forEach((el) => el.addEventListener("input", rerender));
  nowButton.addEventListener("click", () => {
    setToNow();
    rerender();
  });
  rerender();
}

void main();

const TOTAL_ROUNDS = 10;
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

const breeds = [
  "Golden Retriever",
  "Labrador Retriever",
  "German Shepherd",
  "Border Collie",
  "Australian Shepherd",
  "Bernese Mountain Dog",
  "Beagle",
  "Corgi",
  "Dachshund",
  "Shiba Inu",
  "Poodle",
  "Husky",
  "Samoyed",
  "Dalmatian",
  "Boxer",
  "Rottweiler",
  "Cocker Spaniel",
  "Schnauzer",
  "Akita",
  "Great Dane",
  "Newfoundland",
  "Chihuahua",
  "French Bulldog",
  "Bichon Frise",
  "Maltese dog",
  "Vizsla",
  "Weimaraner",
  "Rhodesian Ridgeback",
  "Jack Russell Terrier",
  "Cavalier King Charles Spaniel"
];

const fallbackImages = {
  adult: [
    {
      breed: "Golden Retriever",
      image: "https://commons.wikimedia.org/wiki/Special:FilePath/Golden_Retriever_Carlos_%2810581910556%29.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Golden_Retriever_Carlos_(10581910556).jpg"
    },
    {
      breed: "German Shepherd",
      image: "https://commons.wikimedia.org/wiki/Special:FilePath/German_Shepherd_Dog_standing.jpg",
      page: "https://commons.wikimedia.org/wiki/File:German_Shepherd_Dog_standing.jpg"
    },
    {
      breed: "Beagle",
      image: "https://commons.wikimedia.org/wiki/Special:FilePath/Beagle_600.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Beagle_600.jpg"
    },
    {
      breed: "Siberian Husky",
      image: "https://commons.wikimedia.org/wiki/Special:FilePath/Siberian-husky.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Siberian-husky.jpg"
    }
  ],
  puppy: [
    {
      breed: "Labrador Retriever",
      image: "https://commons.wikimedia.org/wiki/Special:FilePath/Labrador_Retriever_puppy.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Labrador_Retriever_puppy.jpg"
    },
    {
      breed: "Golden Retriever",
      image: "https://commons.wikimedia.org/wiki/Special:FilePath/Golden_Retriever_puppy_standing.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Golden_Retriever_puppy_standing.jpg"
    },
    {
      breed: "Corgi",
      image: "https://commons.wikimedia.org/wiki/Special:FilePath/Welsh_Corgi_Pembroke_puppy.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Welsh_Corgi_Pembroke_puppy.jpg"
    },
    {
      breed: "Beagle",
      image: "https://commons.wikimedia.org/wiki/Special:FilePath/Beagle_puppy_Cadet.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Beagle_puppy_Cadet.jpg"
    }
  ]
};

const state = {
  age: "adult",
  round: 1,
  champion: null,
  challenger: null,
  usedBreeds: new Set(),
  isBusy: false
};

const els = {
  arena: document.querySelector("#arena"),
  result: document.querySelector("#result"),
  roundNow: document.querySelector("#roundNow"),
  restart: document.querySelector("#restartButton"),
  modeButtons: [...document.querySelectorAll(".mode-button")],
  cards: {
    left: document.querySelector('[data-slot="left"]'),
    right: document.querySelector('[data-slot="right"]')
  },
  image: {
    left: document.querySelector("#leftImage"),
    right: document.querySelector("#rightImage")
  },
  name: {
    left: document.querySelector("#leftName"),
    right: document.querySelector("#rightName")
  },
  source: {
    left: document.querySelector("#leftSource"),
    right: document.querySelector("#rightSource")
  }
};

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeBreedName(name) {
  return name.replace(/\bdog\b/gi, "").replace(/\s+/g, " ").trim();
}

function randomBreed(excluding = new Set()) {
  const available = breeds.filter((breed) => !excluding.has(breed));
  const pool = available.length ? available : breeds;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function fetchCommonsDog(breed, age) {
  const searchTerms = age === "puppy"
    ? [`"${breed}" puppy dog`, `${breed} puppy`]
    : [`"${breed}" dog`, `${breed} dog`];

  for (const term of searchTerms) {
    const url = new URL(COMMONS_API);
    url.search = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `${term} filetype:bitmap`,
      gsrnamespace: "6",
      gsrlimit: "12",
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "900",
      origin: "*",
      format: "json"
    }).toString();

    const response = await fetch(url);
    if (!response.ok) continue;

    const data = await response.json();
    const pages = Object.values(data.query?.pages || {});
    const matches = shuffle(pages)
      .map((page) => {
        const info = page.imageinfo?.[0];
        if (!info?.thumburl || !info.mime?.startsWith("image/")) return null;
        return {
          breed: normalizeBreedName(breed),
          image: info.thumburl,
          page: encodeURI(`https://commons.wikimedia.org/wiki/${page.title.replaceAll(" ", "_")}`)
        };
      })
      .filter(Boolean);

    if (matches.length) return matches[0];
  }

  const fallbackPool = fallbackImages[age];
  const fallback = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  return { ...fallback, breed: normalizeBreedName(fallback.breed) };
}

async function nextDog(excludingBreed) {
  const excluding = new Set(state.usedBreeds);
  if (excludingBreed) excluding.add(excludingBreed);
  const breed = randomBreed(excluding);
  state.usedBreeds.add(breed);
  return fetchCommonsDog(breed, state.age);
}

function setCard(slot, dog) {
  const image = els.image[slot];
  image.classList.remove("is-loaded");
  image.alt = dog.breed;
  image.src = dog.image;
  image.onload = () => image.classList.add("is-loaded");
  els.name[slot].textContent = dog.breed;
  els.source[slot].textContent = "Wikimedia Commons";
  els.source[slot].dataset.href = dog.page;
  els.cards[slot].hidden = false;
  els.cards[slot].classList.remove("is-leaving-left", "is-leaving-right", "is-arriving");
}

function handleCardClick(slot, event) {
  if (!event.target.closest(".source")) return;
  event.stopPropagation();
  const href = els.source[slot].dataset.href;
  if (href) window.open(href, "_blank", "noopener,noreferrer");
}

function chooseFromCard(slot, event) {
  if (event.target.closest(".source")) {
    handleCardClick(slot, event);
    return;
  }
  choose(slot);
}

async function startGame(age = state.age) {
  state.age = age;
  state.round = 1;
  state.champion = null;
  state.challenger = null;
  state.usedBreeds = new Set();
  state.isBusy = true;

  els.arena.classList.remove("is-complete");
  els.result.hidden = true;
  els.cards.left.hidden = false;
  els.cards.right.hidden = false;
  els.roundNow.textContent = state.round;
  els.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.age === age);
  });

  const [first, second] = await Promise.all([nextDog(), nextDog()]);
  state.champion = first;
  state.challenger = second;
  setCard("left", first);
  setCard("right", second);
  state.isBusy = false;
}

async function choose(slot) {
  if (state.isBusy) return;
  state.isBusy = true;

  const winnerSlot = slot;
  const loserSlot = slot === "left" ? "right" : "left";
  const winner = slot === "left" ? state.champion : state.challenger;
  state.champion = winner;

  els.cards[loserSlot].classList.add(loserSlot === "left" ? "is-leaving-left" : "is-leaving-right");

  if (state.round >= TOTAL_ROUNDS) {
    await wait(430);
    els.cards[loserSlot].hidden = true;
    els.arena.classList.add("is-complete");
    els.result.hidden = false;
    els.roundNow.textContent = TOTAL_ROUNDS;
    state.isBusy = false;
    return;
  }

  state.round += 1;
  els.roundNow.textContent = state.round;
  const next = await nextDog(winner.breed);
  await wait(430);

  if (winnerSlot === "right") {
    state.champion = next;
    state.challenger = winner;
    setCard("left", next);
    els.cards.left.classList.add("is-arriving");
  } else {
    state.champion = winner;
    state.challenger = next;
    setCard("right", next);
    els.cards.right.classList.add("is-arriving");
  }

  state.isBusy = false;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

els.cards.left.addEventListener("click", (event) => chooseFromCard("left", event));
els.cards.right.addEventListener("click", (event) => chooseFromCard("right", event));
els.restart.addEventListener("click", () => startGame());
els.modeButtons.forEach((button) => {
  button.addEventListener("click", () => startGame(button.dataset.age));
});

startGame();

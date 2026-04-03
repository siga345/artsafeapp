import { describe, expect, it } from "vitest";

import {
  countArtistWorldTextCoreAnswers,
  ensureArtistWorldVisualBoards,
  getArtistWorldJourneyMeta,
  hasArtistWorldTextCore,
  hasArtistWorldVisualContent,
  getArtistWorldReadinessMeta,
  serializeArtistWorld
} from "./artist-world";

describe("artist-world helpers", () => {
  it("always returns the two canonical visual boards and keeps source urls", () => {
    const boards = ensureArtistWorldVisualBoards([
      {
        slug: "fashion",
        name: "Custom name that should be normalized",
        sourceUrl: "https://www.pinterest.com/artist/fashion-board/",
        images: [{ imageUrl: "/uploads/fashion.jpg" }]
      }
    ]);

    expect(boards).toEqual([
      {
        id: null,
        slug: "aesthetics",
        name: "Эстетика",
        sourceUrl: null,
        images: []
      },
      {
        id: null,
        slug: "fashion",
        name: "Фэшн",
        sourceUrl: "https://www.pinterest.com/artist/fashion-board/",
        images: [{ id: null, imageUrl: "/uploads/fashion.jpg" }]
      }
    ]);
  });

  it("counts the required career-system text core groups", () => {
    const count = countArtistWorldTextCoreAnswers({
      mission: "Стать узнаваемым исполнителем",
      identityStatement: "Артист тревожной нежности",
      favoriteArtists: ["A", "B", "C"],
      lifeValues: "Саморазвитие",
      coreThemes: ["Ночь", "Память"]
    });

    expect(count).toBe(4);
    expect(
      hasArtistWorldTextCore({
        mission: "Стать узнаваемым исполнителем",
        identityStatement: "Артист тревожной нежности",
        favoriteArtists: ["A", "B", "C"],
        lifeValues: "Саморазвитие",
        coreThemes: ["Ночь", "Память"]
      })
    ).toBe(true);
  });

  it("requires mission for career-system readiness", () => {
    expect(
      hasArtistWorldTextCore({
        identityStatement: "Артист тревожной нежности",
        lifeValues: "Саморазвитие",
        coreThemes: ["Ночь", "Память"]
      })
    ).toBe(false);
  });

  it("detects visual content from images or external board links", () => {
    expect(
      hasArtistWorldVisualContent({
        visualBoards: [
          {
            slug: "aesthetics",
            name: "Эстетика",
            images: [{ imageUrl: "/uploads/aesthetics.jpg" }]
          },
          {
            slug: "fashion",
            name: "Фэшн",
            images: []
          }
        ]
      })
    ).toBe(true);

    expect(
      hasArtistWorldVisualContent({
        visualBoards: [
          {
            slug: "aesthetics",
            name: "Эстетика",
            sourceUrl: "https://www.pinterest.com/artist/aesthetics-board/",
            images: []
          },
          {
            slug: "fashion",
            name: "Фэшн",
            images: []
          }
        ]
      })
    ).toBe(true);

    expect(hasArtistWorldVisualContent({ visualBoards: [] })).toBe(false);
  });

  it("serializes current focus and support intent fields", () => {
    const world = serializeArtistWorld({
      mission: "Стать узнаваемым артистом",
      currentFocusTitle: "Готовлю релизный драфт",
      currentFocusDetail: "Собираю текст и аранжировку",
      seekingSupportDetail: "Нужен фидбек по концепции",
      supportNeedTypes: ["FEEDBACK", "COLLABORATION"]
    });

    expect(world.currentFocusTitle).toBe("Готовлю релизный драфт");
    expect(world.currentFocusDetail).toBe("Собираю текст и аранжировку");
    expect(world.seekingSupportDetail).toBe("Нужен фидбек по концепции");
    expect(world.supportNeedTypes).toEqual(["FEEDBACK", "COLLABORATION"]);
  });

  it("derives EMPTY, SEEDED, IN_PROGRESS, and READY_INTERNAL readiness states", () => {
    expect(getArtistWorldReadinessMeta({})).toMatchObject({
      state: "EMPTY"
    });

    expect(getArtistWorldReadinessMeta({})).toMatchObject({
      educationalCue: expect.stringContaining("не с песен")
    });

    expect(
      getArtistWorldReadinessMeta({
        worldCreated: true,
        mission: "Стать узнаваемым артистом",
        favoriteArtists: ["A", "B", "C"]
      })
    ).toMatchObject({
      state: "SEEDED"
    });

    expect(
      getArtistWorldReadinessMeta({
        worldCreated: true,
        references: [{ title: "Ref 1" }],
        projects: [{ title: "Project 1" }],
        playlistUrl: "https://example.com",
        favoriteArtists: ["A", "B", "C"]
      })
    ).toMatchObject({
      state: "IN_PROGRESS"
    });

    expect(
      getArtistWorldReadinessMeta({
        worldCreated: true,
        mission: "Стать узнаваемым артистом",
        identityStatement: "Артист ночной нежности",
        lifeValues: "Саморазвитие",
        favoriteArtists: ["A", "B", "C"],
        coreThemes: ["Ночь", "Память"],
        visualDirection: "Cinematic",
        visualBoards: [
          {
            slug: "aesthetics",
            name: "Эстетика",
            images: [{ imageUrl: "/uploads/aesthetic.jpg" }]
          },
          {
            slug: "fashion",
            name: "Фэшн",
            images: []
          }
        ],
        references: [{ title: "Ref 1" }]
      })
    ).toMatchObject({
      state: "READY_INTERNAL"
    });
  });

  it("explains that a ready world is an internal system, not only a profile", () => {
    const meta = getArtistWorldReadinessMeta({
      worldCreated: true,
      mission: "Стать узнаваемым артистом",
      identityStatement: "Артист ночной нежности",
      lifeValues: "Саморазвитие",
      favoriteArtists: ["A", "B", "C"],
      coreThemes: ["Ночь", "Память"],
      visualDirection: "Cinematic",
      visualBoards: [
        {
          slug: "aesthetics",
          name: "Эстетика",
          images: [{ imageUrl: "/uploads/aesthetic.jpg" }]
        },
        {
          slug: "fashion",
          name: "Фэшн",
          images: []
        }
      ],
      references: [{ title: "Ref 1" }]
    });

    expect(meta.summary).toContain("внутренняя система");
    expect(meta.educationalCue).toContain("живой проект");
  });

  it("builds the grouped artist-world journey progressively", () => {
    const seeded = getArtistWorldJourneyMeta({
      worldCreated: true,
      mission: "Давать голос хрупкой ярости",
      identityStatement: "Артист на стыке нежности и шума",
      coreThemes: ["Ночь", "Память"],
      favoriteArtists: ["A", "B"],
      visualDirection: "Cinematic grain",
      aestheticKeywords: ["chrome", "mist"],
      fashionSignals: ["long coat"]
    });

    expect(seeded.state).toBe("NOT_STARTED");
    expect(seeded.currentGroupId).toBe("meaning_core");
    expect(seeded.groups.find((group) => group.id === "music")?.state).toBe("LOCKED");

    const readyMeaning = getArtistWorldJourneyMeta({
      worldCreated: true,
      mission: "Давать голос хрупкой ярости",
      identityStatement: "Артист на стыке нежности и шума",
      philosophy: "Через близость и сопротивление.",
      coreThemes: ["Ночь", "Память"],
      favoriteArtists: ["A", "B"],
      currentFocusTitle: "Собираю EP",
      visualDirection: "Cinematic grain",
      aestheticKeywords: ["chrome", "mist"],
      fashionSignals: ["long coat"],
      visualBoards: [
        { slug: "aesthetics", name: "Эстетика", sourceUrl: "https://example.com/a", images: [] },
        { slug: "fashion", name: "Фэшн", sourceUrl: "https://example.com/f", images: [] }
      ]
    });

    expect(readyMeaning.state).toBe("COMPLETE");
    expect(readyMeaning.groups.find((group) => group.id === "meaning_core")?.state).toBe("COMPLETE");
    expect(readyMeaning.groups.find((group) => group.id === "music")?.state).toBe("COMPLETE");
    expect(readyMeaning.groups.find((group) => group.id === "visual")?.state).toBe("COMPLETE");
  });
});

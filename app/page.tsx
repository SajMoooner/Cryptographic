"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import KeyIcon from "@mui/icons-material/Key";
import Grid3x3Icon from "@mui/icons-material/Grid3x3";
import StreamIcon from "@mui/icons-material/Stream";
import LockIcon from "@mui/icons-material/Lock";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import ShieldIcon from "@mui/icons-material/Shield";

type Task = {
  id: number;
  title: string;
  desc: string;
  href?: string; // ak nie je, karta je WIP
  Icon: typeof AssignmentIcon;
  color: string; // farba highlight pruhu
};

const tasks: Task[] = [
  {
    id: 1,
    title: "Zadanie 1",
    desc: "Vigenereova sifra: automaticka analyza a desifrovanie.",
    href: "/zadanie1",
    Icon: KeyIcon,
    color: "linear-gradient(90deg, #4a63f0, #7c8ff9)",
  },
  {
    id: 2,
    title: "Zadanie 2",
    desc: "Hillova sifra 3x3: rekonstrukcia kluca zo znameho prefixu.",
    href: "/zadanie2",
    Icon: Grid3x3Icon,
    color: "linear-gradient(90deg, #8b5cf6, #c084fc)",
  },
  {
    id: 3,
    title: "Zadanie 3",
    desc: "Prudova sifra (RC4): MD5 kontrola, desifrovanie, bruteforce.",
    href: "/zadanie3",
    Icon: StreamIcon,
    color: "linear-gradient(90deg, #22c55e, #4ade80)",
  },
  {
    id: 4,
    title: "Zadanie 4",
    desc: "Pripravujeme...",
    Icon: ShieldIcon,
    color: "linear-gradient(90deg, #64748b, #94a3b8)",
  },
  {
    id: 5,
    title: "Zadanie 5",
    desc: "Pripravujeme...",
    Icon: BuildCircleIcon,
    color: "linear-gradient(90deg, #a16207, #f59e0b)",
  },
  {
    id: 6,
    title: "Zadanie 6",
    desc: "Pripravujeme...",
    Icon: LockIcon,
    color: "linear-gradient(90deg, #6b7280, #a1a1aa)",
  },
];

export default function Home() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 18% 22%, rgba(99, 102, 241, 0.16), transparent 52%), linear-gradient(140deg, #050b14 0%, #060a12 48%, #04060d 100%)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={{ xs: 6, md: 8 }}>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 2.5,
                py: 1,
                borderRadius: 9999,
                border: "1px solid rgba(148, 163, 184, 0.28)",
                backgroundColor: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(16px)",
              }}
            >
              <AssignmentIcon
                sx={{ fontSize: 18, color: "rgba(165, 180, 252, 0.9)" }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "#ffffff",
                }}
              >
                Kryptografia & Bezpecnost
              </Typography>
            </Box>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "2.35rem", md: "3.45rem" },
                letterSpacing: "-0.035em",
                color: "#ffffff",
              }}
            >
              Minimalisticky prehlad zadani
            </Typography>

            <Typography
              variant="body1"
              sx={{
                maxWidth: 540,
                lineHeight: 1.6,
                color: "#ffffff",
              }}
            >
              Vyber si algoritmus, ktory chces rozoberat. Panel jasne ukazuje,
              co je uz pripravene a co este len dokoncujeme.
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gap: { xs: 2.2, md: 2.6 },
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
            }}
          >
            {tasks.map(({ id, title, desc, href, Icon, color }) => {
              const disabled = !href;
              const baseCardSx = {
                p: { xs: 3, md: 3.5 },
                borderRadius: 4,
                border: "1px solid rgba(148, 163, 184, 0.22)",
                backgroundColor: "rgba(15, 23, 42, 0.55)",
                backdropFilter: "blur(18px)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                transform: "translateY(0)",
                transition:
                  "transform 200ms ease, border-color 200ms ease, box-shadow 220ms ease, opacity 200ms ease",
              } as const;

              const card = (
                <Paper
                  component="article"
                  elevation={0}
                  sx={{
                    ...baseCardSx,
                    opacity: disabled ? 0.68 : 1,
                    boxShadow: disabled
                      ? "0 15px 34px -28px rgba(15, 23, 42, 0.9)"
                      : "0 24px 48px -32px rgba(15, 23, 42, 0.85)",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        backgroundColor: "rgba(99, 102, 241, 0.22)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        sx={{ color: "#ffffff", fontSize: 20 }}
                      />
                    </Box>

                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        flexGrow: 1,
                        letterSpacing: -0.5,
                        color: "#ffffff",
                      }}
                    >
                      {title}
                    </Typography>

                    <Chip
                      size="small"
                      variant="outlined"
                      label={disabled ? "Pripravujeme" : "Dostupne"}
                      sx={{
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        color: "#ffffff",
                        borderColor: disabled
                          ? "rgba(148, 163, 184, 0.38)"
                          : "rgba(16, 185, 129, 0.4)",
                        backgroundColor: disabled
                          ? "transparent"
                          : "rgba(34, 197, 94, 0.12)",
                      }}
                    />
                  </Stack>

                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.7,
                      color: "#ffffff",
                    }}
                  >
                    {desc}
                  </Typography>

                  <Box
                    sx={{
                      height: 2,
                      width: "100%",
                      background: color,
                      borderRadius: 9999,
                      opacity: 0.9,
                    }}
                  />
                </Paper>
              );

              if (disabled) {
                return (
                  <Box key={id} sx={{ pointerEvents: "none" }}>
                    {card}
                  </Box>
                );
              }

              return (
                <Box
                  key={id}
                  component={Link}
                  href={href}
                  sx={{
                    textDecoration: "none",
                    borderRadius: 4,
                    "&:hover article": {
                      transform: "translateY(-6px)",
                      borderColor: "rgba(129, 140, 248, 0.54)",
                      boxShadow:
                        "0 32px 64px -36px rgba(15, 23, 42, 0.85)",
                    },
                    "&:focus-visible article": {
                      outline: "2px solid rgba(129, 140, 248, 0.5)",
                      outlineOffset: "4px",
                    },
                  }}
                >
                  {card}
                </Box>
              );
            })}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

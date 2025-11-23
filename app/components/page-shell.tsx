"use client";

import * as React from "react";
import Link from "next/link";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";

type MaxWidth = "xs" | "sm" | "md" | "lg" | "xl" | false;

type PageShellProps = {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  backHref?: string;
  maxWidth?: MaxWidth;
  toolbar?: React.ReactNode;
};

const backButtonSx = {
  borderColor: "rgba(148, 163, 184, 0.35)",
  color: "#ffffff",
  px: 2.5,
  "&:hover": {
    borderColor: "rgba(129, 140, 248, 0.7)",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
};

export default function PageShell({
  title,
  subtitle,
  children,
  backHref = "/",
  maxWidth = "lg",
  toolbar,
}: PageShellProps) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        backgroundColor: "#01030a",
        color: "#ffffff",
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(59, 130, 246, 0.28), transparent 40%), radial-gradient(circle at 80% 0%, rgba(16, 185, 129, 0.24), transparent 55%)",
          opacity: 0.75,
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 28px)",
          opacity: 0.25,
        }}
      />
      <Container
        maxWidth={maxWidth}
        sx={{
          py: { xs: 6, md: 8 },
          flexGrow: 1,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Stack spacing={{ xs: 4, md: 5 }}>
          <Stack spacing={{ xs: 3, md: 3.5 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              {backHref ? (
                <Button
                  component={Link}
                  href={backHref}
                  size="small"
                  variant="outlined"
                  startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
                  sx={backButtonSx}
                >
                  Spat na prehlad
                </Button>
              ) : (
                <Box />
              )}
              {toolbar}
            </Stack>

            <Stack spacing={1.5}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2.4,
                  py: 0.85,
                  borderRadius: 9999,
                  border: "1px solid rgba(148, 163, 184, 0.28)",
                  backgroundColor: "rgba(15, 23, 42, 0.45)",
                  backdropFilter: "blur(16px)",
                  alignSelf: { xs: "flex-start", sm: "flex-start" },
                }}
              >
                <AssignmentIcon sx={{ fontSize: 18, color: "rgba(165, 180, 252, 0.9)" }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    color: "rgba(255, 255, 255, 0.9)",
                  }}
                >
                  Kryptografia &amp; Bezpečnosť
                </Typography>
              </Box>

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "2rem", md: "2.8rem" },
                  letterSpacing: "-0.03em",
                  maxWidth: 720,
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body1"
                  sx={{
                    maxWidth: 620,
                    color: "rgba(255, 255, 255, 0.82)",
                    lineHeight: 1.6,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Stack>
          </Stack>

          {children}
        </Stack>
      </Container>
    </Box>
  );
}

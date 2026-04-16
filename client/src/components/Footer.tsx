import React from "react";
import { Box, Container, Grid, Link, Typography } from "@mui/material";

const Footer: React.FC = () => {
  return (
    <Box component="footer" sx={{ bgcolor: "#000957", color: "#fff", mt: "auto" }}>
      <Container sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" fontWeight={800}>YourApp</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1, maxWidth: 480 }}>
              Fast, secure, and clean UX for modern web apps. Built on MUI, engineered for teams.
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 1 }}>
              Product
            </Typography>
            <Link href="/#features" color="inherit" underline="hover" display="block">Features</Link>
            <Link href="/#about" color="inherit" underline="hover" display="block">About</Link>
            <Link href="/dashboard" color="inherit" underline="hover" display="block">Dashboard</Link>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 1 }}>
              Account
            </Typography>
            <Link href="/auth?mode=login" color="inherit" underline="hover" display="block">Log in</Link>
            <Link href="/auth?mode=signup" color="inherit" underline="hover" display="block">Sign up</Link>
          </Grid>
        </Grid>
        <Typography variant="body2" sx={{ mt: 3, opacity: 0.8 }}>
          © {new Date().getFullYear()} YourApp. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;

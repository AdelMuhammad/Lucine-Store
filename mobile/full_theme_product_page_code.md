import React, { useState } from 'react';
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  Container,
  Grid,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Rating,
  Card,
  CardMedia,
  Stack,
  Divider,
} from '@mui/material';
import { ShoppingBagOutlined, FavoriteBorder, Star, ArrowBack } from '@mui/icons-material';

// ----------------------------------------------------------------------
// 1. COLORS & THEME SETUP (MUI + TypeScript)
// ----------------------------------------------------------------------

export const lucineColors = {
  gold: {
    main: '#D4AF37',
    light: '#E8C86B',
    dark: '#A38118',
    contrastText: '#0F1B29',
  },
  navy: {
    main: '#0F1B29',
    light: '#1E2D40',
    dark: '#090F18',
    contrastText: '#FFFFFF',
  },
  rose: {
    main: '#E5B8AF',
    light: '#F7E4E0',
    dark: '#C48D82',
    contrastText: '#0F1B29',
  },
  background: {
    default: '#FAF8F5',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#757575',
  },
};

export const lucineTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: lucineColors.gold.main,
      light: lucineColors.gold.light,
      dark: lucineColors.gold.dark,
      contrastText: lucineColors.gold.contrastText,
    },
    secondary: {
      main: lucineColors.navy.main,
      light: lucineColors.navy.light,
      dark: lucineColors.navy.dark,
      contrastText: lucineColors.navy.contrastText,
    },
    background: {
      default: lucineColors.background.default,
      paper: lucineColors.background.paper,
    },
    text: {
      primary: lucineColors.text.primary,
      secondary: lucineColors.text.secondary,
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Alexandria", sans-serif',
    h1: {
      fontFamily: '"Playfair Display", "Alexandria", serif',
      fontWeight: 700,
      color: lucineColors.navy.main,
    },
    h2: {
      fontFamily: '"Playfair Display", "Alexandria", serif',
      fontWeight: 600,
      color: lucineColors.navy.main,
    },
    h3: {
      fontFamily: '"Playfair Display", "Alexandria", serif',
      fontWeight: 600,
      color: lucineColors.navy.main,
    },
    subtitle1: {
      fontSize: '1rem',
      color: lucineColors.text.secondary,
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.6,
      color: lucineColors.text.primary,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.9rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
});

// ----------------------------------------------------------------------
// 2. PRODUCT PAGE COMPONENT
// ----------------------------------------------------------------------

interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

const colorOptions: ColorOption[] = [
  { id: '1', name: 'Rose Gold', hex: lucineColors.rose.main },
  { id: '2', name: 'Navy Blue', hex: lucineColors.navy.main },
  { id: '3', name: 'Classic Gold', hex: lucineColors.gold.main },
];

export const LucineProductPage: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<ColorOption>(colorOptions[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  return (
    <ThemeProvider theme={lucineTheme}>
      <CssBaseline />
      <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          
          {/* Header Navigation */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <IconButton color="secondary" size="small">
              <ArrowBack />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              Home / Accessories / Scarves
            </Typography>
          </Stack>

          <Grid container spacing={5}>
            
            {/* Left Column: Image */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: '1px solid #EAEAEA', borderRadius: 4, overflow: 'hidden' }}>
                <CardMedia
                  component="img"
                  height="480"
                  image="https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&q=80&w=800"
                  alt="Lucine Silk Scarf"
                  sx={{ objectFit: 'cover' }}
                />
              </Card>
            </Grid>

            {/* Right Column: Product Details */}
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                
                <Box>
                  <Chip
                    label="New Collection"
                    size="small"
                    sx={{
                      backgroundColor: lucineColors.rose.light,
                      color: lucineColors.navy.main,
                      fontWeight: 600,
                      mb: 1.5,
                    }}
                  />
                  <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' } }}>
                    Lucine Premium Silk Scarf
                  </Typography>

                  {/* Rating */}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                    <Rating
                      value={4.8}
                      precision={0.1}
                      readOnly
                      emptyIcon={<Star style={{ opacity: 0.55 }} fontSize="inherit" />}
                      sx={{ color: 'primary.main' }}
                    />
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      4.8
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      (124 Reviews)
                    </Typography>
                  </Stack>
                </Box>

                {/* Price */}
                <Stack direction="row" alignItems="baseline" spacing={2}>
                  <Typography variant="h3" color="primary.dark" fontWeight={700}>
                    $125.00
                  </Typography>
                  <Typography variant="body1" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                    $160.00
                  </Typography>
                </Stack>

                {/* Description */}
                <Typography variant="body1" color="text.primary">
                  Crafted from 100% pure silk, the Lucine Scarf delivers an unmatched soft touch with an elegant crescent-inspired pattern. Perfect for elevating day-to-evening outfits.
                </Typography>

                <Divider sx={{ borderStyle: 'dashed' }} />

                {/* Color Selector */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                    Color: {selectedColor.name}
                  </Typography>
                  <Stack direction="row" spacing={1.5}>
                    {colorOptions.map((option) => (
                      <Box
                        key={option.id}
                        onClick={() => setSelectedColor(option)}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: option.hex,
                          cursor: 'pointer',
                          border: '2px solid',
                          borderColor: selectedColor.id === option.id ? 'secondary.main' : 'transparent',
                          outline: selectedColor.id === option.id ? `2px solid ${lucineColors.gold.main}` : 'none',
                          transition: 'all 0.2s ease-in-out',
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} alignItems="center" sx={{ pt: 1 }}>
                  
                  {/* Quantity controls */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    sx={{
                      border: '1px solid #D1D1D1',
                      borderRadius: 3,
                      px: 1,
                      py: 0.5,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <Button
                      size="small"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      sx={{ minWidth: 32, color: 'text.primary', fontWeight: 700 }}
                    >
                      -
                    </Button>
                    <Typography variant="body1" sx={{ px: 1.5, fontWeight: 700 }}>
                      {quantity}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setQuantity(quantity + 1)}
                      sx={{ minWidth: 32, color: 'text.primary', fontWeight: 700 }}
                    >
                      +
                    </Button>
                  </Stack>

                  {/* Add to Cart Button */}
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<ShoppingBagOutlined />}
                    fullWidth
                    sx={{
                      backgroundColor: 'primary.main',
                      color: 'secondary.main',
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 700,
                      boxShadow: 'none',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    Add to Cart
                  </Button>

                  {/* Favorite Button */}
                  <IconButton
                    onClick={() => setIsFavorite(!isFavorite)}
                    sx={{
                      border: '1px solid #E2E2E2',
                      borderRadius: 3,
                      p: 1.5,
                      color: isFavorite ? 'error.main' : 'text.secondary',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <FavoriteBorder />
                  </IconButton>
                </Stack>

              </Stack>
            </Grid>

          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default LucineProductPage;
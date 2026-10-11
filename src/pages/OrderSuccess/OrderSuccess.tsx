import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Alert,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import './OrderSuccess.css';
import { isOrderConfirmation } from '../../features/orders/ordersApi';
import OrderDetails from '../../features/orders/OrderDetails';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { acknowledgeOrder } from '../../features/orders/ordersSlice';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const orderState = useAppSelector((state) => state.orders);
  const state: unknown = location.state;
  const routeConfirmation =
    typeof state === 'object' && state !== null && 'confirmation' in state
      ? state.confirmation
      : null;
  const confirmation = isOrderConfirmation(routeConfirmation)
    ? routeConfirmation
    : orderState.confirmation;

  useEffect(() => {
    if (
      orderState.status === 'succeeded' &&
      orderState.confirmation?.orderId === confirmation?.orderId
    ) {
      dispatch(acknowledgeOrder());
    }
  }, [orderState.status, orderState.confirmation, confirmation, dispatch]);

  if (!isOrderConfirmation(confirmation)) {
    return (
      <Container maxWidth="md" className="OrderSuccess-Container">
        <Alert severity="warning" sx={{ my: 4 }}>
          No confirmed order is available. Check with the store if you already submitted an order.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/products')}>
          Continue Shopping
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className="OrderSuccess-Container">
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CheckCircleIcon sx={{ fontSize: 100, color: '#4caf50', mb: 3 }} />

        <Typography
          component="h1"
          className="OrderSuccess-Title"
          variant="h3"
          gutterBottom
          fontWeight="bold"
        >
          Thank You for Your Order!
        </Typography>

        <Typography variant="h6" color="text.secondary" mb={4}>
          Your order has been successfully placed
        </Typography>

        <Card sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Order Details
            </Typography>
            <Divider sx={{ my: 2 }} />

            <OrderDetails order={confirmation} />

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary">
              Payment is cash on delivery.
            </Typography>
          </CardContent>
        </Card>

        <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/')}
            className="Home-Button"
          >
            Back to Home
          </Button>

          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/products')}
            className="Continue-Shopping-Button"
          >
            Continue Shopping
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default OrderSuccess;

import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useMediaQuery,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useAppSelector } from '../../app/hooks';
import ProductFormModal from './ProductFormModal';
import { formatCurrency } from '../../utils/utils';
import './Admin.css';
import { getProductImage } from '../../utils/images';
import type { Product, ProductType } from '../../types/product';

const TYPE_LABELS: Record<ProductType, string> = {
  headphones: 'Headphones',
  speakers: 'Speakers',
  earphones: 'Earphones',
};

const FILTERS: Array<ProductType | 'all'> = ['all', 'headphones', 'speakers', 'earphones'];
const PAGE_SIZE = 7;
const LOW_STOCK = 10;

type SortKey = 'price' | 'stock';

export default function Admin() {
  const isMobile = useMediaQuery('(max-width: 700px)');
  const products = useAppSelector((state) => state.products.data);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ProductType | 'all'>('all');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = products.filter((product) => {
      const matchesType = type === 'all' || product.type === type;
      const matchesQuery =
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.shortName.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query);
      return matchesType && matchesQuery;
    });
    if (!sort) return matches;
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...matches].sort((left, right) => {
      const difference =
        sort.key === 'price' ? left.price - right.price : left.inStock - right.inStock;
      return difference * direction;
    });
  }, [products, search, sort, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, (currentPage + 1) * PAGE_SIZE);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const changeType = (value: ProductType | 'all') => {
    setType(value);
    setPage(0);
  };

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
    setPage(0);
  };

  const renderActions = (product: Product) => (
    <Box className="Admin-Actions">
      <IconButton
        size="small"
        className="Admin-EditBtn"
        aria-label={`Edit ${product.shortName}`}
        onClick={() => {
          setEditProduct(product);
          setModalOpen(true);
        }}
      >
        <EditOutlinedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        className="Admin-DeleteBtn"
        aria-label={`Delete ${product.shortName}`}
        onClick={() => setDeleteProduct(product)}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  return (
    <Box className="Admin">
      <nav className="Admin-Breadcrumb" aria-label="Breadcrumb">
        <span>Admin</span>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Products</span>
      </nav>

      <Box className="Admin-Heading">
        <Box className="Admin-TitleGroup">
          <Typography variant="h4" component="h1" className="Admin-Title">
            Products
          </Typography>
          <Typography variant="body2" className="Admin-Count">
            {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
          </Typography>
        </Box>
        <Button
          className="Admin-AddButton"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditProduct(null);
            setModalOpen(true);
          }}
        >
          Add product
        </Button>
      </Box>

      <Box className="Admin-Panel">
        <Box className="Admin-Toolbar">
          <TextField
            placeholder="Search by name or SKU..."
            size="small"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            className="Admin-Search"
            inputProps={{ 'aria-label': 'Search by name or SKU' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Box className="Admin-Filters" role="group" aria-label="Filter by type">
            {FILTERS.map((filter) => (
              <Chip
                key={filter}
                label={filter === 'all' ? 'All' : TYPE_LABELS[filter]}
                clickable
                aria-pressed={type === filter}
                className={`Admin-Filter ${type === filter ? 'Admin-Filter--active' : ''}`}
                onClick={() => changeType(filter)}
              />
            ))}
          </Box>
        </Box>

        {isMobile ? (
          <Box className="Admin-MobileProducts">
            <Box className="Admin-MobileSort" role="group" aria-label="Sort products">
              {(['price', 'stock'] as const).map((key) => (
                <Button
                  key={key}
                  size="small"
                  onClick={() => toggleSort(key)}
                  endIcon={
                    sort?.key === key ? (
                      sort.direction === 'asc' ? (
                        <ArrowUpwardIcon />
                      ) : (
                        <ArrowDownwardIcon />
                      )
                    ) : undefined
                  }
                  aria-label={`Sort by ${key}${sort?.key === key ? `, ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
                >
                  {key === 'price' ? 'Price' : 'Stock'}
                </Button>
              ))}
            </Box>
            <Box component="ul" className="Admin-Cards" aria-label="Products">
              {visible.map((product) => (
                <Box component="li" key={product.id} className="Admin-Card">
                  <Box className="Admin-ProductCell">
                    <img
                      src={getProductImage(product.images.cover)}
                      alt=""
                      className="Admin-ProductImage"
                    />
                    <Box className="Admin-ProductIdentity">
                      <Typography component="h2" className="Admin-ProductName">
                        {product.shortName}
                      </Typography>
                      <Typography variant="caption" className="Admin-ProductId">
                        {product.id}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={TYPE_LABELS[product.type]}
                    size="small"
                    className={`Admin-TypeChip Admin-TypeChip--${product.type}`}
                  />
                  <Box component="dl" className="Admin-CardDetails">
                    <Box>
                      <Typography component="dt" variant="caption">
                        Price
                      </Typography>
                      <Typography component="dd" className="Admin-Price">
                        {formatCurrency(product.price)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography component="dt" variant="caption">
                        Stock
                      </Typography>
                      <Box component="dd" className="Admin-StockCell">
                        <Typography
                          className={`Admin-Stock ${product.inStock <= LOW_STOCK ? 'Admin-Stock--low' : ''}`}
                        >
                          {product.inStock}
                        </Typography>
                        {product.inStock <= LOW_STOCK && (
                          <Chip label="Low stock" size="small" className="Admin-LowStock" />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  {renderActions(product)}
                </Box>
              ))}
            </Box>
            {filtered.length === 0 && (
              <Typography className="Admin-Empty">No products found</Typography>
            )}
          </Box>
        ) : (
          <TableContainer className="Admin-TableContainer">
            <Table>
              <TableHead>
                <TableRow className="Admin-TableHead">
                  <TableCell>Product</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell
                    align="right"
                    sortDirection={sort?.key === 'price' ? sort.direction : false}
                  >
                    <TableSortLabel
                      active={sort?.key === 'price'}
                      direction={sort?.key === 'price' ? sort.direction : 'asc'}
                      onClick={() => toggleSort('price')}
                    >
                      Price
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sortDirection={sort?.key === 'stock' ? sort.direction : false}
                  >
                    <TableSortLabel
                      active={sort?.key === 'stock'}
                      direction={sort?.key === 'stock' ? sort.direction : 'asc'}
                      onClick={() => toggleSort('stock')}
                    >
                      Stock
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((product) => (
                  <TableRow key={product.id} className="Admin-TableRow">
                    <TableCell>
                      <Box className="Admin-ProductCell">
                        <img
                          src={getProductImage(product.images.cover)}
                          alt=""
                          className="Admin-ProductImage"
                        />
                        <Box>
                          <Typography variant="body2" className="Admin-ProductName">
                            {product.shortName}
                          </Typography>
                          <Typography variant="caption" className="Admin-ProductId">
                            {product.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={TYPE_LABELS[product.type]}
                        size="small"
                        className={`Admin-TypeChip Admin-TypeChip--${product.type}`}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" className="Admin-Price">
                        {formatCurrency(product.price)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box className="Admin-StockCell">
                        {product.inStock <= LOW_STOCK && (
                          <Chip label="Low stock" size="small" className="Admin-LowStock" />
                        )}
                        <Typography
                          variant="body2"
                          className={`Admin-Stock ${product.inStock <= LOW_STOCK ? 'Admin-Stock--low' : ''}`}
                        >
                          {product.inStock}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{renderActions(product)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" className="Admin-Empty">
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box className="Admin-Pagination">
          <Typography variant="body2">
            {rangeStart}–{rangeEnd} of {filtered.length}
          </Typography>
          <Box>
            <IconButton
              aria-label="Previous page"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              aria-label="Next page"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <ProductFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditProduct(null);
        }}
        product={editProduct}
      />

      <Dialog
        open={Boolean(deleteProduct)}
        onClose={() => setDeleteProduct(null)}
        PaperProps={{ className: 'Admin-DeleteDialog' }}
      >
        <DialogTitle className="Admin-DeleteDialog-Title">Delete Product</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deleteProduct?.shortName}</strong>? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions className="Admin-DeleteDialog-Actions">
          <Button onClick={() => setDeleteProduct(null)} className="Admin-DeleteDialog-CancelBtn">
            Cancel
          </Button>
          <Button
            onClick={() => setDeleteProduct(null)}
            variant="contained"
            className="Admin-DeleteDialog-ConfirmBtn"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

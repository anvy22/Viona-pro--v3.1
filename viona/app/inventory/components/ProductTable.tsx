"use client";

import { useState, useMemo, memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddProductDialog } from "./AddProductDialog";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { Edit, Trash2, Eye, Loader2 } from "lucide-react";
import type { Product } from "../../api/inventory/products/route";
import { useOrgStore } from "@/hooks/useOrgStore";

interface ProductTableProps {
  products: Product[];
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (
    id: string,
    product: Omit<Product, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  isLoading?: boolean;
  isEmployee: boolean;
}

// RBAC-aware row component
const ProductRow = memo(
  ({
    product,
    onEdit,
    onDeleteClick,
    canEdit,
    canDelete,
  }: {
    product: Product;
    onEdit: (product: Product) => void;
    onDeleteClick: (product: Product) => void;
    canEdit: boolean;
    canDelete: boolean;
  }) => {
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(price);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    const stockStatus = useMemo(() => {
      if (product.stock === 0)
        return { label: "Out of Stock", variant: "secondary" as const };
      if (product.stock < 10)
        return { label: "Low Stock", variant: "destructive" as const };
      return { label: "In Stock", variant: "default" as const };
    }, [product.stock]);

    return (
      <TableRow>
        <TableCell>
          <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  if (target.parentElement) {
                    target.parentElement.innerHTML =
                      '<div class="text-xs text-muted-foreground">No Image</div>';
                  }
                }}
              />
            ) : (
              <div className="text-xs text-muted-foreground">No Image</div>
            )}
          </div>
        </TableCell>
        <TableCell className="font-medium">
          <div className="max-w-[200px] truncate" title={product.name}>
            {product.name}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground font-mono text-sm">
          {product.sku}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="min-w-[20px] font-medium">{product.stock}</span>
            {product.stock < 10 && product.stock > 0 && (
              <Badge variant="destructive" className="text-xs">
                Low
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="font-medium">
          {formatPrice(product.price)}
        </TableCell>
        <TableCell>
          <Badge
            variant={stockStatus.variant}
            className={
              product.stock > 0
                ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100"
                : ""
            }
          >
            {stockStatus.label}
          </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
          {formatDate(product.createdAt)}
        </TableCell>
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
          {formatDate(product.updatedAt)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {/* View - Always visible to all roles */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/inventory/${product.id}`}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>View details</TooltipContent>
            </Tooltip>

            {/* Edit - Only visible to admin/manager, NOT to employees */}
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(product)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit product</TooltipContent>
              </Tooltip>
            )}

            {/* Delete - Only visible to admin/manager, NOT to employees */}
            {canDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteClick(product)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete product</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }
);

ProductRow.displayName = "ProductRow";

export function ProductTable({
  products,
  onDelete,
  onUpdate,
  isLoading = false,
  isEmployee,
}: ProductTableProps) {
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const canEdit = !!onUpdate && !isEmployee;
  const canDelete = !!onDelete && !isEmployee;



  const handleEdit = (product: Product) => {
    if (!canEdit || isEmployee) return; // Double guard
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    if (!canDelete || isEmployee) return; // Double guard
    setDeleteProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteProduct && onDelete && !isEmployee) {
      await onDelete(deleteProduct.id);
      setDeleteProduct(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleUpdateProduct = async (
    updatedProduct: Omit<Product, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingProduct && onUpdate && !isEmployee) {
      await onUpdate(editingProduct.id, updatedProduct);
      setEditingProduct(null);
      setIsEditDialogOpen(false);
    }
  };

  return (
    <TooltipProvider>
      <Card >
        <CardHeader>
          <div className="flex-[3] p-1 space-y-1 min-h-0 overflow-hidden h-full">
            <CardTitle>Products</CardTitle>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded border">
            <div className="max-h-[calc(100vh-290px)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Modified
                    </TableHead>
                    <TableHead className="text-right w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-35 text-center text-muted-foreground"
                      >
                        No products found. Try adjusting your filters or add your
                        first product.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        onEdit={handleEdit}
                        onDeleteClick={handleDeleteClick}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog - Only render if NOT employee */}
      {!isEmployee && canEdit && (
        <AddProductDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setEditingProduct(null);
          }}
          onSave={handleUpdateProduct}
          product={editingProduct}
          orgId={selectedOrgId || ""}
          mode="edit"
        />
      )}

      {/* Delete Dialog - Only render if NOT employee */}
      {!isEmployee && canDelete && (
        <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          product={deleteProduct}
        />
      )}
    </TooltipProvider>
  );
}
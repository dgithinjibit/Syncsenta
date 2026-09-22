
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AddTransactionDialog } from '@/components/add-transaction-dialog';
import type { Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { mockTransactions } from '@/lib/mock-data';


export default function SchoolFinancePage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isAddTransactionOpen, setAddTransactionOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // In a real app, this would be a fetch call.
        // For now, we simulate fetching from our mock service.
        const storedTransactions = localStorage.getItem('mockTransactions');
        if (storedTransactions) {
            setTransactions(JSON.parse(storedTransactions));
        } else {
            setTransactions(mockTransactions);
            localStorage.setItem('mockTransactions', JSON.stringify(mockTransactions));
        }
    }, []);

    const handleAddTransaction = (newTransaction: Omit<Transaction, 'id' | 'date'>) => {
        const transactionToAdd: Transaction = {
            ...newTransaction,
            id: `txn_${Date.now()}`,
            date: new Date().toISOString().split('T')[0], // Get today's date in YYYY-MM-DD format
        };
        const updatedTransactions = [transactionToAdd, ...transactions];
        setTransactions(updatedTransactions);
        localStorage.setItem('mockTransactions', JSON.stringify(updatedTransactions));
        toast({
            title: "Transaction Logged",
            description: `A new transaction for KES ${newTransaction.amount.toLocaleString()} has been added.`
        });
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>School Financial Management / Usimamizi wa Fedha</CardTitle>
                        <CardDescription>
                            Track all school-related income and expenditures from this hub.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setAddTransactionOpen(true)}>
                        <PlusCircle className="mr-2" />
                        Add New Transaction
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount (KES)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell>{new Date(transaction.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</TableCell>
                                    <TableCell className="font-medium">{transaction.description}</TableCell>
                                    <TableCell><Badge variant="outline">{transaction.category}</Badge></TableCell>
                                    <TableCell>
                                        <Badge variant={transaction.status === 'Completed' ? 'secondary' : transaction.status === 'Pending Approval' ? 'destructive' : 'default'}>
                                            {transaction.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{transaction.amount.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">
                        Transactions exceeding the county threshold will require approval from the County Officer.
                    </p>
                </CardFooter>
            </Card>

            <AddTransactionDialog
                open={isAddTransactionOpen}
                onOpenChange={setAddTransactionOpen}
                onAddTransaction={handleAddTransaction}
            />
        </>
    );
}

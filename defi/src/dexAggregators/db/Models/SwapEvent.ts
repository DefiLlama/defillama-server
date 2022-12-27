import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class SwapEvent {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column("text")
  user: string;

  @Column("text")
  aggregator: string;

  @Column("boolean")
  isError: boolean;

  @Column("text")
  chain: string;

  @Column("text")
  from: string;

  @Column("text")
  to: string;

  @Column("json")
  quote: any;

  @Column("text", { default: null })
  txUrl: string;

  @Column("text", { nullable: true })
  amount: string;

  @Column("json")
  errorData: any;
}

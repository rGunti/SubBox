import {Table, Column, Model, HasMany, CreatedAt, UpdatedAt, DeletedAt, PrimaryKey, AllowNull, Unique} from 'sequelize-typescript';

@Table({
    tableName: 'users'
})
export class User extends Model<User> {
    @PrimaryKey
    @Unique
    @Column({ field: 'id' })
    id:string;

    @Column({ field: 'display_name' })
    displayName:string;

    @AllowNull
    @Column({ field: 'access_token' })
    accessToken:string;

    @AllowNull
    @Column({ field: 'refresh_token' })
    refreshToken:string;
    
    @CreatedAt
    @Column({ field: 'created_on' })
    createdOn: Date;

    @UpdatedAt
    @Column({ field: 'updated_on' })
    updatedOn: Date;

    @DeletedAt
    @Column({ field: 'deleted_on' })
    deletedOn: Date;
}
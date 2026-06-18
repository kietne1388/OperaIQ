using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using OperaIQ.Application.Common;
using OperaIQ.Domain.Common;
using OperaIQ.Infrastructure.Data;

namespace OperaIQ.Infrastructure.Repositories
{
    public class TenantRepository<T> : ITenantRepository<T> where T : TenantBaseEntity
    {
        protected readonly ApplicationDbContext _context;
        protected readonly DbSet<T> _dbSet;

        public TenantRepository(ApplicationDbContext context)
        {
            _context = context;
            _dbSet = _context.Set<T>();
        }

        public virtual async Task<T?> GetByIdAsync(Guid id)
        {
            return await _dbSet.FindAsync(id);
        }

        public virtual async Task<T?> GetByIdAsync(Guid id, params Expression<Func<T, object>>[] includes)
        {
            IQueryable<T> query = ApplyIncludes(_dbSet.AsQueryable(), includes);
            return await query.FirstOrDefaultAsync(entity => entity.Id == id);
        }

        public virtual async Task<IEnumerable<T>> GetAllAsync()
        {
            return await _dbSet.ToListAsync();
        }

        public virtual async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate)
        {
            return await _dbSet.Where(predicate).ToListAsync();
        }

        public virtual async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate, params Expression<Func<T, object>>[] includes)
        {
            IQueryable<T> query = ApplyIncludes(_dbSet.AsQueryable(), includes);
            return await query.Where(predicate).ToListAsync();
        }

        public virtual async Task AddAsync(T entity)
        {
            // Tự động gán TenantId từ DbContext nếu chưa được gán
            if (entity.TenantId == Guid.Empty)
            {
                entity.TenantId = _context.CurrentTenantId;
            }
            await _dbSet.AddAsync(entity);
        }

        public virtual void Update(T entity)
        {
            _dbSet.Update(entity);
        }

        public virtual void Delete(T entity)
        {
            // Nhờ SaveChangesAsync của ApplicationDbContext xử lý soft delete tự động,
            // hoặc gán thủ công:
            entity.IsDeleted = true;
            entity.DeletedAt = DateTime.UtcNow;
            _dbSet.Update(entity);
        }

        public virtual async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        protected static IQueryable<T> ApplyIncludes(IQueryable<T> query, params Expression<Func<T, object>>[] includes)
        {
            if (includes == null || includes.Length == 0)
            {
                return query;
            }

            foreach (var include in includes)
            {
                query = query.Include(include);
            }

            return query;
        }
    }
}
